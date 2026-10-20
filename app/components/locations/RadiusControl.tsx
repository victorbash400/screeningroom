import { useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import styles from "./RadiusControl.module.css";

export default function RadiusControl({ radius, onChange }: { radius: number; onChange: (radius: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null);
  const [limit, setLimit] = useState(100_000);
  const [error, setError] = useState("");
  const value = draft ?? radius;
  const minimum = Math.min(100, radius);
  const maximum = Math.max(limit, radius <= Number.MAX_VALUE / 2 ? radius * 2 : Number.MAX_VALUE);
  function commit() { if (draft !== null && draft !== radius) onChange(draft); setDraft(null); }
  return <div className={styles.control}>
    <div className={styles.range}>
      <input className={styles.slider} aria-label="Search radius" aria-valuetext={`${value / 1000} kilometers`} type="range" min={minimum} max={maximum} step={100} value={value}
        style={{ "--range-fill": `${(value - minimum) / (maximum - minimum) * 100}%` } as CSSProperties}
        onChange={(event) => setDraft(event.target.valueAsNumber)} onPointerUp={commit} onKeyUp={commit} onBlur={commit} onPointerCancel={() => setDraft(null)} />
      <input className={styles.distance} key={radius} aria-label="Radius in kilometers" inputMode="decimal" defaultValue={radius / 1000} onBlur={(event) => {
        const kilometers = Number(event.target.value);
        if (!event.target.value.trim() || !Number.isFinite(kilometers * 1000) || kilometers <= 0) { setError("Enter a positive radius."); return; }
        setError(""); onChange(kilometers * 1000);
      }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
      <span>km</span>
      <button type="button" aria-label="Expand radius range" title="Expand radius range" disabled={maximum === Number.MAX_VALUE} onClick={() => setLimit(maximum <= Number.MAX_VALUE / 2 ? maximum * 2 : Number.MAX_VALUE)}><Plus size={14} /></button>
    </div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
