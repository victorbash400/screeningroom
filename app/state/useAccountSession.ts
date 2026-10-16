import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountUser, AuthStep } from "../lib/accountTypes";
import { sessionExpiry } from "../lib/sessionExpiry";
import { clearAccountData } from "../lib/storage";
import { clearLocalFiles } from "../lib/localFiles";
import { ApiError, apiRequest, object, parseUser } from "../lib/accountApi";
export function useAccountSession() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupId, setCleanupId] = useState<string | null>(null);
  const active = useRef(true);
  const channel = useRef<BroadcastChannel | null>(null);
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {
      let value: unknown;
      try {
        value = await apiRequest("/api/auth/session");
      } catch (failure) {
        if (!(failure instanceof ApiError) || failure.status !== 401)
          throw failure;
        value = await apiRequest("/api/auth/refresh", { method: "POST" });
      }
      const result = object(value);
      if (active.current && version === generation.current) {
        const expiry =
          result.user === null ? null : sessionExpiry(result.expiresAt);
        setUser(result.user === null ? null : parseUser(result.user));
        setExpiresAt(expiry);
        setError(null);
      }
    } catch (failure) {
      if (active.current && version === generation.current) {
        setUser(null);
        setExpiresAt(null);
        setError(
          failure instanceof Error ? failure.message : "Cannot load account.",
        );
      }
    } finally {
      if (active.current && version === generation.current) setReady(true);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void load();
    const events = new BroadcastChannel("screeningroom-account");
    channel.current = events;
    events.onmessage = (event) => {
      if (event.data === "changed") {
        setReady(false);
        setUser(null);
        setExpiresAt(null);
        void load();
      }
    };
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", visible);
      active.current = false;
      channel.current = null;
      events.close();
    };
  }, [load]);
  useEffect(() => {
    if (expiresAt === null) return;
    const timeout = window.setTimeout(
      () => {
        generation.current += 1;
        setUser(null);
        setExpiresAt(null);
        setReady(true);
        setError("Session expired. Sign in again.");
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [expiresAt]);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const version = generation.current;
    try {
      return await apiRequest(path, init);
    } catch (failure) {
      if (!(failure instanceof ApiError) || failure.status !== 401)
        throw failure;
      try {
        const refreshed = object(
          await apiRequest("/api/auth/refresh", { method: "POST" }),
        );
        if (version !== generation.current)
          throw new Error("Account session changed.");
        const expiry = sessionExpiry(refreshed.expiresAt);
        setUser(parseUser(refreshed.user));
        setExpiresAt(expiry);
        return await apiRequest(path, init);
      } catch (refreshError) {
        if (version === generation.current) {
          generation.current += 1;
          setUser(null);
          setExpiresAt(null);
          channel.current?.postMessage("changed");
        }
        throw refreshError;
      }
    }
  }, []);
  async function authenticate(
    step: AuthStep,
    fields: { email: string; password: string; name: string; code: string },
  ): Promise<AuthStep | "done" | null> {
    setBusy(true);
    setError(null);
    try {
      const routes = {
        "sign-in": "/api/auth/sign-in",
        "sign-up": "/api/auth/sign-up",
        confirm: "/api/auth/confirm",
        reset: "/api/auth/password/reset",
        "reset-confirm": "/api/auth/password/confirm",
      };
      const bodies = {
        "sign-in": { email: fields.email, password: fields.password },
        "sign-up": {
          email: fields.email,
          password: fields.password,
          name: fields.name,
        },
        confirm: { email: fields.email, code: fields.code },
        reset: { email: fields.email },
        "reset-confirm": {
          email: fields.email,
          code: fields.code,
          password: fields.password,
        },
      };
      const result = object(
        await apiRequest(routes[step], {
          method: "POST",
          body: JSON.stringify(bodies[step]),
        }),
      );
      if (step === "sign-in") {
        const expiry = sessionExpiry(result.expiresAt);
        generation.current += 1;
        setUser(parseUser(result.user));
        setExpiresAt(expiry);
        setReady(true);
        channel.current?.postMessage("changed");
        return "done";
      }
      if (step === "sign-up") {
        if (result.confirmationRequired !== true)
          throw new Error("Account confirmation response is invalid.");
        return "confirm";
      }
      if (step === "confirm") {
        if (result.confirmed !== true)
          throw new Error("Account confirmation failed.");
        return "sign-in";
      }
      if (step === "reset") {
        if (result.sent !== true)
          throw new Error("Password reset response is invalid.");
        return "reset-confirm";
      }
      if (result.ok !== true) throw new Error("Password reset failed.");
      return "sign-in";
    } catch (failure) {
      if (
        step === "sign-in" &&
        failure instanceof ApiError &&
        failure.status === 403 &&
        typeof failure.data === "object" &&
        failure.data !== null &&
        "code" in failure.data &&
        failure.data.code === "EMAIL_UNCONFIRMED"
      )
        return "confirm";
      setError(failure instanceof Error ? failure.message : "Sign in failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function signInDemo() {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      const result = object(
        await apiRequest("/api/auth/demo", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );
      const expiry = sessionExpiry(result.expiresAt);
      generation.current += 1;
      setUser(parseUser(result.user));
      setExpiresAt(expiry);
      setReady(true);
      channel.current?.postMessage("changed");
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Demo sign in failed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const result = object(
        await apiRequest("/api/auth/sign-out", { method: "POST" }),
      );
      if (result.ok !== true) throw new Error("Sign out failed.");
      generation.current += 1;
      setUser(null);
      setExpiresAt(null);
      setReady(true);
      channel.current?.postMessage("changed");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign out failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function retryCleanup(id = cleanupId) {
    if (!id) return true;
    try {
      await clearLocalFiles(`screeningroom.v1.account.${id}`);
      clearAccountData(localStorage, id);
      setCleanupId(null);
      setError(null);
      return true;
    } catch {
      setCleanupId(id);
      setError("Account deleted. Retry clearing this account’s browser data.");
      return false;
    }
  }
  async function deleteAccount(email: string) {
    if (!user || busy) return false;
    setBusy(true);
    setError(null);
    try {
      const result = object(
        await request("/api/account", {
          method: "DELETE",
          body: JSON.stringify({ email }),
        }),
      );
      if (result.deleted !== true)
        throw new Error("Account deletion was not confirmed.");
      await retryCleanup(user.id);
      generation.current += 1;
      setUser(null);
      setExpiresAt(null);
      setReady(true);
      channel.current?.postMessage("changed");
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Cannot delete account.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveName(name: string) {
    setBusy(true);
    setError(null);
    try {
      const result = object(
        await request("/api/account", {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }),
      );
      setUser(parseUser(result.user));
      channel.current?.postMessage("changed");
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Cannot save account.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function resend(email: string) {
    setBusy(true);
    setError(null);
    try {
      const result = object(
        await apiRequest("/api/auth/resend", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      );
      if (result.sent !== true)
        throw new Error("Verification code could not be sent.");
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Cannot resend code.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    signInDemo,
    resend,
    deleteAccount,
    cleanupPending: cleanupId !== null,
    retryCleanup,
    user,
    ready,
    busy,
    error,
    setError,
    load,
    request,
    authenticate,
    signOut,
    saveName,
  };
}
