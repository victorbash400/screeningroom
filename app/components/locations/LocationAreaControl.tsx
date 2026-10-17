import { X } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import IconButton from "../controls/IconButton";
import styles from "./LocationAreaControl.module.css";
import glass from "../workspace/PreviewGlass.module.css";

export default function LocationAreaControl({ area, onChange }: {
  area: LocationInterest;
  onChange: (area?: LocationInterest) => void;
}) {
  return <div className={`${styles.area} ${glass.surface}`}>
    <span title={area.name}>{area.name}</span>
    <label><input aria-label="Area radius in kilometers" type="number" min="0.1" step="0.1" value={area.radius / 1000}
      onChange={(event) => { const radius = event.target.valueAsNumber * 1000; if (Number.isFinite(radius) && radius > 0) onChange({ ...area, radius }); }} />km</label>
    <IconButton label="Clear area of interest" onClick={() => onChange(undefined)}><X /></IconButton>
  </div>;
}
