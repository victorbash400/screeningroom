"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "./AccountContext";
import { RoomSync } from "../lib/roomSync";
import { uploadCloudFile, uploadRoomFiles } from "../lib/cloudFiles";
import { parseData, storageKey } from "../lib/storage";

export function useRoomData(scope: string) {
  const account = useAccount();
  const [, render] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasLegacy, setHasLegacy] = useState(false);
  const sync = useMemo(() => {
    const uploads = new Map<string, string>();
    return new RoomSync(account.request, (data, signal) => uploadRoomFiles(data, uploads, signal),
      async (data, signal) => (await uploadCloudFile(new Blob([JSON.stringify(data)], { type: "application/json" }), signal, false)).slice(11), () => {
      const channel = new BroadcastChannel(scope);
      channel.postMessage({ type: "committed" });
      channel.close();
    });
  }, [account.request, scope]);
  const importBrowserData = useCallback(async (key = storageKey) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const id = Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
    await sync.import(parseData(raw), id);
  }, [sync]);
  const checkSync = useCallback(() => sync.checkSync(), [sync]);
  useEffect(() => account.beforeSignOut(() => sync.saveBeforeLeaving()), [account.beforeSignOut, sync]);
  useEffect(() => {
    let active = true;
    sync.activate();
    setHasLegacy(localStorage.getItem(storageKey) !== null);
    const unsubscribe = sync.subscribe(() => { if (active) { setError(sync.error); render((value) => value + 1); } });
    void sync.load().then(async () => {
      if (!active || !sync.ready || sync.error) return;
      try { await importBrowserData(scope); }
      catch (error) { if (active) setError(error instanceof Error ? error.message : "Cannot import browser data."); }
    });
    const channel = new BroadcastChannel(scope);
    channel.onmessage = (event) => { if (event.data?.type === "committed" && !sync.unsaved) void sync.load(); };
    const leaving = (event: BeforeUnloadEvent) => { if (sync.unsaved) event.preventDefault(); };
    window.addEventListener("beforeunload", leaving);
    return () => { active = false; sync.dispose(); unsubscribe(); channel.close(); window.removeEventListener("beforeunload", leaving); };
  }, [sync, scope, importBrowserData]);
  return { data: sync.data, ready: sync.ready, error, setError, syncStatus: sync.syncStatus,
    checkSync, syncNow: () => sync.retry(),
    update: sync.update.bind(sync), reload: () => { void sync.retry(); }, hasLegacy, save: () => sync.saveBeforeLeaving(), importBrowserData: async () => {
    try { await importBrowserData(); setHasLegacy(false); }
    catch (error) { setError(error instanceof Error ? error.message : "Cannot import browser data."); }
  }, scope };
}
