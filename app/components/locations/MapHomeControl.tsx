import { useEffect, useId, useRef, useState } from "react";
import { House, LoaderCircle } from "lucide-react";
import { useAccount } from "../../state/AccountContext";
import { mapHomeResponseSchema } from "../../lib/mapHome";
import type { LocationInterest } from "../../lib/locationInterest";
import styles from "./MapHomeControl.module.css";

export default function MapHomeControl({ area, onArea }: { area: LocationInterest; onArea: (area?: LocationInterest) => void }) {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<ReturnType<typeof mapHomeResponseSchema.parse> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const active = useRef<AbortController | null>(null);
  const id = useId();
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  async function request(home?: LocationInterest) {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError("");
    if (!home) setSaved(null);
    try {
      const response = await account.fetch("/api/locations/home", {
        signal: controller.signal,
        ...(home && saved ? { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ home: { name: home.name, latitude: home.latitude, longitude: home.longitude }, revision: saved.revision }) } : {}),
      });
      const value = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 409) setSaved(null);
        throw new Error(value.error || "Home location could not be loaded.");
      }
      setSaved(mapHomeResponseSchema.parse(value));
      if (home) { setOpen(false); button.current?.focus(); }
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Home location could not be loaded."); }
    finally { if (active.current === controller) setBusy(false); }
  }
  return <div className={styles.control} ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); button.current?.focus(); } }}>
    <button type="button" ref={button} className={styles.trigger} aria-label="Home location" title="Home location" aria-expanded={open} aria-controls={id} onClick={() => { setOpen(!open); if (!open) void request(); }}><House /></button>
    {open && <div id={id} className={styles.menu} role="group" aria-label="Home location">
      <button type="button" disabled={busy || !saved?.home} onClick={() => { if (saved?.home) { onArea({ ...area, ...saved.home }); setOpen(false); button.current?.focus(); } }}>Go home{saved?.home && <small>{saved.home.name}</small>}</button>
      <button type="button" disabled={busy || !saved} onClick={() => void request(area)}>Set this location as home</button>
      {busy && <LoaderCircle size={15} className={styles.busy} aria-label="Saving or loading home location" />}
      {error && <p role="alert">{error}</p>}
      {error && <button type="button" disabled={busy} onClick={() => void request()}>Reload</button>}
    </div>}
  </div>;
}
