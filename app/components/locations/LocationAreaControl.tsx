import type { LocationInterest } from "../../lib/locationInterest";
import { MapPin } from "lucide-react";
import styles from "./LocationAreaControl.module.css";

export default function LocationAreaControl({ area, onChange, onSetLocation }: {
  onSetLocation: () => void;
  area: LocationInterest;
  onChange: (area?: LocationInterest) => void;
}) {
  return <div className={styles.area}>
    <button type="button" className={styles.location} title={`Set location: ${area.name}`} onClick={onSetLocation} aria-label={`Set location: ${area.name}`}><MapPin size={13} /><span>{area.name}</span></button>
    <label><input aria-label="Area radius in kilometers" type="number" min="0.1" step="0.1" value={area.radius / 1000}
      onChange={(event) => { const radius = event.target.valueAsNumber * 1000; if (Number.isFinite(radius) && radius > 0) onChange({ ...area, radius }); }} />km</label>
  </div>;
}
