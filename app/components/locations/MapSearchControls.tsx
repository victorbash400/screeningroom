import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { GripHorizontal, LoaderCircle } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import LocationAreaControl from "./LocationAreaControl";
import LocationSearch from "./LocationSearch";
import VenueFilters from "./VenueFilters";
import styles from "./MapSearchControls.module.css";

export default function MapSearchControls({ area, onArea, searching, error, onSearchArea, onMove, onMoveKey }: {
  area: LocationInterest;
  onArea: (area?: LocationInterest) => boolean;
  searching: boolean;
  error: string;
  onSearchArea: () => void;
  onMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onMoveKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const search = useRef<HTMLInputElement>(null);
  return (
    <header className={styles.header}>
      <div className={styles.searchRow}>
        <button type="button" title="Move map" aria-label="Move map" className={styles.handle} onPointerDown={onMove} onKeyDown={onMoveKey}><GripHorizontal /></button>
        <LocationSearch inputRef={search} onSelect={(place) => onArea({ ...area, ...place })} />
        <VenueFilters selected={area.venueTypes ?? []} onChange={(venueTypes) => onArea({ ...area, venueTypes })} />
      </div>
      <div className={styles.areaRow}>
        <LocationAreaControl area={area} onChange={onArea} onSetLocation={() => { search.current?.focus(); search.current?.select(); }} />
        <button type="button" className={styles.searchArea} disabled={searching} onClick={onSearchArea}>{searching && <LoaderCircle size={14} className={styles.busy} />}Search area</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </header>
  );
}
