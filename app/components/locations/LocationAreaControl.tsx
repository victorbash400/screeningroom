import type { LocationInterest } from "../../lib/locationInterest";
import { MapPin } from "lucide-react";
import RadiusControl from "./RadiusControl";
import styles from "./LocationAreaControl.module.css";

export default function LocationAreaControl({ area, onChange, onSetLocation, country = false }: {
  onSetLocation: () => void;
  area: LocationInterest;
  onChange: (area?: LocationInterest) => void;
  country?: boolean;
}) {
  return <div className={styles.area}>
    <button type="button" className={styles.location} title={`Set location: ${area.name}`} onClick={onSetLocation} aria-label={`Set location: ${area.name}`}><MapPin size={13} /><span>{area.name}</span></button>
    {!country && <RadiusControl radius={area.radius} onChange={(radius) => onChange({ ...area, radius })} />}
  </div>;
}
