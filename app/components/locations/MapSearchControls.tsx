import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import LocationAreaControl from "./LocationAreaControl";
import CountryPicker from "./CountryPicker";
import { radiusArea } from "../../lib/locationInterest";
import LocationSearch from "./LocationSearch";
import VenueFilters from "./VenueFilters";
import styles from "./MapSearchControls.module.css";

export default function MapSearchControls({ area, onArea, searching, error, onSearchArea, live = true, countryPreview }: {
  area: LocationInterest;
  onArea: (area?: LocationInterest) => boolean;
  searching: boolean;
  error: string;
  onSearchArea?: () => void;
  live?: boolean;
  countryPreview?: { open: boolean; query: string };
}) {
  const [choosingCountry, setChoosingCountry] = useState(false);
  const country = choosingCountry || Boolean(area.countryCode) || Boolean(countryPreview);
  const search = useRef<HTMLInputElement>(null);
  return (
    <header className={styles.header}>
      <div className={styles.searchRow}>
        <div className={styles.modes} role="group" aria-label="Area selection">
          <button type="button" aria-pressed={!country} onClick={() => { if (onArea(radiusArea(area))) setChoosingCountry(false); }}>Radius</button>
          <button type="button" aria-pressed={country} onClick={() => setChoosingCountry(true)}>Country</button>
        </div>
        {country ? <CountryPicker inputRef={search} preview={countryPreview} selected={area.countryCode} onSelect={(selected) => { if (onArea({ ...area, name: selected.name, latitude: selected.latitude, longitude: selected.longitude, countryCode: selected.code })) setChoosingCountry(false); }} /> : <LocationSearch inputRef={search} onSelect={(place) => onArea({ ...radiusArea(area), ...place })} />}
        {live && <VenueFilters selected={area.venueTypes ?? []} onChange={(venueTypes) => onArea({ ...area, venueTypes })} />}
      </div>
      <div className={styles.areaRow}>
        <LocationAreaControl country={country} area={area} onChange={onArea} onSetLocation={() => { search.current?.focus(); search.current?.select(); }} />
        {onSearchArea && <button type="button" className={styles.searchArea} aria-label="Search area" disabled={searching || country && !area.countryCode} onClick={onSearchArea}>{searching && <LoaderCircle size={14} className={styles.busy} />}Search area</button>}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </header>
  );
}
