import { useCallback, useEffect, useRef, useState } from "react";
import { shouldOpenTour, tourStatusSchema, type TourStatus } from "../lib/productTour";
import { useAccount } from "./AccountContext";

export function useProductTour(ready: boolean, empty: boolean) {
  const { user, request } = useAccount();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TourStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const handled = useRef(false);
  const failedSave = useRef(false);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void request("/api/onboarding", { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) { setStatus(tourStatusSchema.parse(value)); setError(null); }
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Cannot load walkthrough preferences.");
    });
    return () => controller.abort();
  }, [user?.id, request, attempt]);
  useEffect(() => {
    if (!ready || !status || handled.current) return;
    handled.current = true;
    if (shouldOpenTour(status, empty)) setOpen(true);
  }, [ready, status, empty]);
  const save = useCallback(async () => {
    try { tourStatusSchema.parse(await request("/api/onboarding", { method: "PUT" })); failedSave.current = false; setError(null); }
    catch (failure) { failedSave.current = true; setError(failure instanceof Error ? failure.message : "Cannot save walkthrough preferences."); }
  }, [request]);
  function close() { handled.current = true; setOpen(false); void save(); }
  function show() { setOpen(true); }
  function retry() { if (failedSave.current) void save(); else setAttempt(value => value + 1); }
  return { open, show, close, error, retry, clearError: () => setError(null) };
}
