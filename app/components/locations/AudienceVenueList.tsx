import { MapPin, ExternalLink } from "lucide-react";
import type { VenueResults } from "../../lib/audienceWidget";
import AudienceMetricDetails from "./AudienceMetricDetails";
import AudienceWidgetShell from "./AudienceWidgetShell";
import { useAudienceMap } from "./AudienceMapContext";
import styles from "./AudienceVenueList.module.css";

export default function AudienceVenueList({ widget }: { widget: VenueResults }) {
  const map = useAudienceMap();
  return <AudienceWidgetShell details={widget.basis === "taste" ? <AudienceMetricDetails kind="venues" /> : undefined} title={`Venues · ${widget.area.name}`} source={widget.source === "OpenStreetMap" ? "© OpenStreetMap contributors" : widget.source === "Geoapify" ? "Geoapify · © OpenStreetMap contributors" : widget.basis === "taste" ? "Qloo · taste affinity" : "Qloo · venue discovery"}
    onMap={widget.venues.length ? () => map?.showPlaces(widget.venues) : undefined}>
    <div className={styles.list}>{widget.venues.map((venue, index) => <div key={venue.id ?? `${venue.longitude}:${venue.latitude}`} className={styles.venue}>
      <button type="button" className={styles.place} onClick={() => map?.showPlaces(widget.venues, index)}>
        <MapPin size={15} /><span><strong>{venue.name}</strong>{venue.address && <small>{venue.address}</small>}</span>
      </button>
      {venue.affinity !== undefined && <span className={styles.affinity} title="Qloo affinity index">{venue.affinity.toFixed(2)}</span>}
      {venue.website && <a href={venue.website} target="_blank" rel="noopener noreferrer" aria-label={`${venue.name} website`}><ExternalLink size={13} /></a>}
    </div>)}</div>
    {!widget.venues.length && <button type="button" className={styles.expand} disabled={map?.busy} onClick={() => map?.ask(`Expand the venue search around ${widget.area.name} to ${widget.area.radius * 2 / 1000} km.`)}>Expand search to {widget.area.radius * 2 / 1000} km</button>}
  </AudienceWidgetShell>;
}
