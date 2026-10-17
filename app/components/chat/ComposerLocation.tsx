import { MapPin } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import styles from "./ComposerLocation.module.css";

export default function ComposerLocation({ area, onClick }: { area: LocationInterest; onClick: () => void }) {
  return <button type="button" className={styles.location} onClick={onClick} title={`Location of interest: ${area.name}`} aria-label={`Location of interest: ${area.name}. Open map.`}>
    <MapPin size={14} /><span>{area.name}</span>
  </button>;
}
