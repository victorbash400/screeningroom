import { useCallback, useEffect, useRef, useState } from "react";
import { defaultAppearance, parseAppearance, type Appearance } from "../lib/appearance";
import { object } from "../lib/accountApi";
import { useAccount } from "./AccountContext";

export function useAccountAppearance() {
  const account = useAccount();
  const [value, setValue] = useState(defaultAppearance);
  const [error, setError] = useState<string | null>(null);
  const desired = useRef(defaultAppearance);
  const revision = useRef<number | null>(null);
  const saving = useRef(false);
  const identity = useRef(account.user?.id);
  identity.current = account.user?.id;
  const dirty = useRef(false);
  const save = useCallback(async (): Promise<void> => {
    if (saving.current || revision.current === null || !identity.current) return;
    const id = identity.current;
    saving.current = true;
    try {
      while (dirty.current && identity.current === id) {
        const next = desired.current;
        const result = object(await account.request("/api/appearance", { method: "PUT", body: JSON.stringify({ value: next, revision: revision.current }) }));
        if (identity.current !== id) return;
        if (!Number.isSafeInteger(result.revision)) throw new Error("Server did not confirm the appearance save.");
        revision.current = Number(result.revision);
        dirty.current = desired.current !== next;
        setError(null);
        const channel = new BroadcastChannel(`screeningroom.appearance.${id}`);
        channel.postMessage({ type: "committed" });
        channel.close();
      }
    } catch (failure) {
      if (identity.current === id) setError(failure instanceof Error ? failure.message : "Cannot save appearance.");
    } finally {
      saving.current = false;
      if (identity.current !== id && dirty.current) void save();
    }
  }, [account.request]);
  const load = useCallback(async () => {
    const id = identity.current;
    if (!id) return;
    try {
      const result = object(await account.request("/api/appearance"));
      if (identity.current !== id) return;
      if (!Number.isSafeInteger(result.revision)) throw new Error("Invalid appearance response.");
      revision.current = Number(result.revision);
      if (!dirty.current) {
        const legacy = revision.current === 0 ? localStorage.getItem(`screeningroom.appearance.${id}`) : null;
        const next = parseAppearance(legacy ?? JSON.stringify(result.value));
        desired.current = next;
        setValue(next);
        dirty.current = legacy !== null;
      }
      setError(null);
      await save();
    } catch (failure) { if (identity.current === id) setError(failure instanceof Error ? failure.message : "Cannot load appearance."); }
  }, [account.request, save]);
  useEffect(() => account.beforeSignOut(async () => {
    await save();
    return !dirty.current && !saving.current;
  }), [account.beforeSignOut, save]);
  useEffect(() => {
    revision.current = null;
    dirty.current = false;
    desired.current = defaultAppearance;
    setValue(defaultAppearance);
    setError(null);
    if (!account.user?.id) return;
    void load();
    const channel = new BroadcastChannel(`screeningroom.appearance.${account.user.id}`);
    channel.onmessage = (event) => { if (event.data?.type === "committed" && !dirty.current && !saving.current) void load(); };
    return () => channel.close();
  }, [account.user?.id, load]);
  function update(next: Appearance) {
    try {
      const raw = JSON.stringify(next);
      parseAppearance(raw);
      if (revision.current === null || !identity.current) throw new Error("Appearance has not loaded. Retry.");
      desired.current = next;
      dirty.current = true;
      setValue(next);
      setError(null);
      void save();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Cannot save appearance.",
      );
    }
  }
  return { value, error, update, retry: () => { void load(); } };
}
