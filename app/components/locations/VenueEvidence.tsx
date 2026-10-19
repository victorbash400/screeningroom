import { ChevronDown } from "lucide-react";
import type { MapPlace } from "../../lib/mapScene";
import ReferenceInfluence from "../research/ReferenceInfluence";
import styles from "./VenueEvidence.module.css";

export default function VenueEvidence({ place }: { place: MapPlace }) {
  if (!place.contributions?.length && !place.audienceProfile) return null;
  return <details className={styles.evidence}>
    <summary>Why this venue<ChevronDown size={13} /></summary>
    {place.contributions?.length ? <ReferenceInfluence references={place.contributions} /> : null}
    {place.audienceProfile && <div className={styles.profile}><span>Qloo venue profile</span><p>{place.audienceProfile}</p></div>}
  </details>;
}
