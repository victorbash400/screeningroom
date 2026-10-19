import { useState } from "react";
import type { MapPlace } from "../../lib/mapScene";
import styles from "./VenueCarouselCard.module.css";

export default function VenueCarouselCard({ place, index, active, selected, onSelect }: { place: MapPlace; index: number; active: boolean; selected: boolean; onSelect: () => void }) {
  const [failedImage, setFailedImage] = useState<string>();
  const image = place.image && place.image !== failedImage ? place.image : undefined;
  return <button type="button" className={styles.card} data-active={active} data-image={Boolean(image)} aria-pressed={selected} onClick={onSelect}>
    <span className={styles.top}><span>{String(index + 1).padStart(2, "0")}</span>{place.category && <span>{place.category}</span>}</span>
    <span className={styles.body}>
      <span className={styles.identity}><strong>{place.name}</strong>{place.address && <small title={place.address}>{place.address}</small>}
        {place.description && <span className={styles.description}>{place.description}</span>}
      </span>
      {image && <img className={styles.photo} src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedImage(image)} />}
    </span>
    {place.affinity !== undefined && <span className={styles.affinity}><span>Qloo affinity</span><output aria-label="Qloo venue affinity">{place.affinity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</output></span>}
  </button>;
}
