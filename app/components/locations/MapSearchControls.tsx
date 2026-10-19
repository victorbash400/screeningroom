import { useRef } from "react";
import { LoaderCircle } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import LocationAreaControl from "./LocationAreaControl";
import LocationSearch from "./LocationSearch";
import VenueFilters from "./VenueFilters";
import styles from "./MapSearchControls.module.css";

export default function MapSearchControls({ area, onArea, searching, error, onSearchArea, live = true }: {
  area: LocationInterest;
  onArea: (area?: LocationInterest) => boolean;
  searching: boolean;
  error: string;
  onSearchArea?: () => void;
  live?: boolean;
}) {
  const search = useRef<HTMLInputElement>(null);
  return (
    <header className={styles.header}>
      <div className={styles.searchRow}>
        <LocationSearch inputRef={search} onSelect={(place) => onArea({ ...area, ...place })} />
        {live && <VenueFilters selected={area.venueTypes ?? []} onChange={(venueTypes) => onArea({ ...area, venueTypes })} />}
      </div>
      <div className={styles.areaRow}>
        <LocationAreaControl area={area} onChange={onArea} onSetLocation={() => { search.current?.focus(); search.current?.select(); }} />
        {onSearchArea && <button type="button" className={styles.searchArea} aria-label="Search area" disabled={searching} onClick={onSearchArea}>{searching && <LoaderCircle size={14} className={styles.busy} />}Search area</button>}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </header>
  );
}
