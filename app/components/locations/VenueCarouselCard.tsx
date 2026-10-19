import EntityImage from "../media/EntityImage";
import { canResolveEntityImage } from "../../lib/entityImage";
import type { MapPlace } from "../../lib/mapScene";
import styles from "./VenueCarouselCard.module.css";

export default function VenueCarouselCard({ place, index, active, selected, onSelect }: { place: MapPlace; index: number; active: boolean; selected: boolean; onSelect: () => void }) {
  const hasPhoto = Boolean(place.image || (place.source === "Qloo" && canResolveEntityImage(place.id)));
  return <article className={styles.card} data-active={active} data-image={hasPhoto}>
    <button type="button" className={styles.select} aria-pressed={selected} onClick={onSelect}>
    <span className={styles.top}><span>{String(index + 1).padStart(2, "0")}</span>{place.category && <span>{place.category}</span>}</span>
    <span className={styles.body}>
      <span className={styles.identity}><strong>{place.name}</strong>{place.address && <small title={place.address}>{place.address}</small>}
        {place.description && <span className={styles.description}>{place.description}</span>}
      </span>
    </span>
    {place.affinity !== undefined && <span className={styles.affinity}><span>Qloo affinity</span><output aria-label="Qloo venue affinity">{place.affinity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</output></span>}
    </button>
    {hasPhoto && <EntityImage className={styles.photo} src={place.image} entityId={place.source === "Qloo" ? place.id : undefined} label={place.name} />}
  </article>;
}
