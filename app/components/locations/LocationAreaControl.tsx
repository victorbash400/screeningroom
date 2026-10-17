import { useState, type CSSProperties } from "react";
import type { LocationInterest } from "../../lib/locationInterest";
import { MapPin } from "lucide-react";
import styles from "./LocationAreaControl.module.css";

export default function LocationAreaControl({ area, onChange, onSetLocation }: {
  onSetLocation: () => void;
  area: LocationInterest;
  onChange: (area?: LocationInterest) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const radius = draft ?? area.radius;
  const minimum = Math.min(100, area.radius);
  const maximum = Math.max(100_000, area.radius);
  const kilometers = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(radius / 1000);
  function commit() {
    if (draft !== null && draft !== area.radius) onChange({ ...area, radius: draft });
    setDraft(null);
  }
  return <div className={styles.area}>
    <button type="button" className={styles.location} title={`Set location: ${area.name}`} onClick={onSetLocation} aria-label={`Set location: ${area.name}`}><MapPin size={13} /><span>{area.name}</span></button>
    <label className={styles.range}>
      <input aria-label="Search radius" aria-valuetext={`${kilometers} kilometers`} type="range" min={minimum} max={maximum} step={100}
        value={radius} style={{ "--range-fill": `${(radius - minimum) / (maximum - minimum) * 100}%` } as CSSProperties}
        onChange={(event) => setDraft(event.target.valueAsNumber)} onPointerUp={commit} onKeyUp={commit} onBlur={commit}
        onPointerCancel={() => setDraft(null)} />
      <output>{kilometers} km</output>
    </label>
  </div>;
}
