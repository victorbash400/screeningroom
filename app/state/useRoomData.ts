"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyData, parseData, readData, storageKey } from "../lib/storage";
import { recordActivity } from "../lib/activity";
import type { RoomData } from "../lib/types";

export function useRoomData(key = storageKey) {
  const [data, setData] = useState<RoomData>(emptyData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(data);
  const writable = useRef(false);
  const load = useCallback(() => {
    try {
      const next = readData(key);
      current.current = next;
      writable.current = true;
      setData(next);
      setError(null);
    } catch (failure) {
      writable.current = false;
      setError(
        failure instanceof Error
          ? failure.message
          : "Cannot read saved workspaces.",
      );
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    load();
    function onStorage(event: StorageEvent) {
      if (event.key === key || event.key === null) load();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load, key]);
  const update = useCallback(
    (change: (previous: RoomData) => RoomData) => {
      if (!writable.current) {
        setError("Saved workspaces could not be loaded. Retry before editing.");
        return false;
      }
      try {
        const next = recordActivity(current.current, change(current.current));
        const serialized = JSON.stringify(next);
        parseData(serialized);
        localStorage.setItem(key, serialized);
        current.current = next;
        setData(next);
        setError(null);
        return true;
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Cannot save changes. Free browser storage and retry.",
        );
        return false;
      }
    },
    [key],
  );
  return { data, ready, error, update, setError, reload: load, scope: key };
}
