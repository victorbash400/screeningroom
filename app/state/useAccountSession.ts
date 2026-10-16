import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountUser, AuthStep } from "../lib/accountTypes";
import { sessionExpiry } from "../lib/sessionExpiry";
import { clearAccountData } from "../lib/storage";
import { clearLocalFiles } from "../lib/localFiles";
import { ApiError, apiRequest, object, parseUser, refreshAccountSession } from "../lib/accountApi";
export function useAccountSession() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const generation = useRef(0);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const checking = useRef<{ version: number; promise: Promise<void> } | null>(null);
  const refreshing = useRef<Promise<unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupId, setCleanupId] = useState<string | null>(null);
  const active = useRef(true);
  const channel = useRef<BroadcastChannel | null>(null);
  const refreshSession = useCallback(() => {
    if (!refreshing.current) {
      refreshing.current = refreshAccountSession()
        .finally(() => { refreshing.current = null; });
    }
    return refreshing.current;
  }, []);
  const load = useCallback(() => {
    const version = generation.current;
    if (checking.current?.version === version) return checking.current.promise;
    const promise = (async () => {
      try {
        let value: unknown;
        try {
          value = await apiRequest("/api/auth/session");
        } catch (failure) {
          if (!(failure instanceof ApiError) || failure.status !== 401) throw failure;
          value = await refreshSession();
        }
        const result = object(value);
        const nextUser = result.user === null ? null : parseUser(result.user);
        if (nextUser !== null) sessionExpiry(result.expiresAt);
        if (active.current && version === generation.current) {
          setReady(true);
          if (nextUser === null) generation.current += 1;
          setUser(nextUser);
          setUnavailable(false);
          setError(null);
        }
      } catch (failure) {
        if (active.current && version === generation.current) {
          setReady(true);
          const rejected = failure instanceof ApiError && failure.status === 401;
          if (rejected) {
            generation.current += 1;
            setUser(null);
          }
          setUnavailable(!rejected);
          setError(failure instanceof Error ? failure.message : "Cannot load account.");
        }
      } finally {
        if (checking.current?.version === version) checking.current = null;
      }
    })();
    checking.current = { version, promise };
    return promise;
  }, [refreshSession]);
  useEffect(() => {
    active.current = true;
    void load();
    const events = new BroadcastChannel("screeningroom-account");
    channel.current = events;
    events.onmessage = (event) => {
      const message: unknown = event.data;
      if (typeof message !== "object" || message === null || !("type" in message)) return;
      if (message.type === "signed-out") {
        generation.current += 1;
        setUser(null);
        setReady(true);
        setUnavailable(false);
        setError(null);
      } else if (message.type === "signed-in") {
        generation.current += 1;
        setReady(false);
        setUser(null);
        void load();
      } else if (message.type === "profile-updated" && "user" in message) {
        try {
          const profile = parseUser(message.user);
          setUser((previous) => previous?.id === profile.id ? profile : previous);
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : "Invalid account update.");
        }
      }
    };
    return () => {
      active.current = false;
      channel.current = null;
      events.close();
    };
  }, [load]);
  const fetchAuthenticated = useCallback<typeof fetch>(async (path, init) => {
    const version = generation.current;
    const send = () => fetch(path, { ...init, credentials: "same-origin", cache: "no-store" });
    const response = await send();
    if (version !== generation.current) throw new Error("Account session changed.");
    if (response.status !== 401) return response;
    await response.body?.cancel();
    try {
      const refreshed = object(await refreshSession());
      if (version !== generation.current) throw new Error("Account session changed.");
      sessionExpiry(refreshed.expiresAt);
      setUser(parseUser(refreshed.user));
      setUnavailable(false);
    } catch (failure) {
      if (version === generation.current) {
        if (failure instanceof ApiError && failure.status === 401) {
          generation.current += 1;
          setUser(null);
          setUnavailable(false);
          channel.current?.postMessage({ type: "signed-out" });
        } else setUnavailable(true);
        setError(failure instanceof Error ? failure.message : "Cannot refresh account.");
      }
      throw failure;
    }
    const retried = await send();
    if (version !== generation.current) {
      await retried.body?.cancel();
      throw new Error("Account session changed.");
    }
    if (retried.status === 401) {
      generation.current += 1;
      setUser(null);
      setUnavailable(false);
      channel.current?.postMessage({ type: "signed-out" });
    }
    return retried;
  }, [refreshSession]);
  const request = useCallback((path: string, init?: RequestInit) =>
    apiRequest(path, init, fetchAuthenticated), [fetchAuthenticated]);
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
        sessionExpiry(result.expiresAt);
        generation.current += 1;
        setUser(parseUser(result.user));
        setReady(true);
        setUnavailable(false);
        channel.current?.postMessage({ type: "signed-in" });
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
      setReady(true);
      setUnavailable(false);
      channel.current?.postMessage({ type: "signed-out" });
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
      setReady(true);
      setUnavailable(false);
      channel.current?.postMessage({ type: "signed-out" });
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
      const profile = parseUser(result.user);
      setUser(profile);
      channel.current?.postMessage({ type: "profile-updated", user: profile });
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
    resend,
    deleteAccount,
    cleanupPending: cleanupId !== null,
    retryCleanup,
    user,
    ready,
    unavailable,
    busy,
    error,
    setError,
    load,
    request,
    fetch: fetchAuthenticated,
    authenticate,
    signOut,
    saveName,
  };
}
