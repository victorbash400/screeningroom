import VenueEvidence from "./VenueEvidence";
import VenueAffinity from "./VenueAffinity";
import EntityImage from "../media/EntityImage";
import { canResolveEntityImage } from "../../lib/entityImage";
import { MapPin, ExternalLink } from "lucide-react";
import type { VenueResults } from "../../lib/audienceWidget";
import AudienceWidgetShell from "./AudienceWidgetShell";
import { useAudienceMap } from "./AudienceMapContext";
import styles from "./AudienceVenueList.module.css";

export default function AudienceVenueList({ widget }: { widget: VenueResults }) {
  const map = useAudienceMap();
  return <AudienceWidgetShell title={`Venues · ${widget.area.name}`} source={widget.source === "OpenStreetMap" ? "© OpenStreetMap contributors" : widget.source === "Geoapify" ? "Geoapify · © OpenStreetMap contributors" : widget.basis === "taste" ? "Qloo" : "Qloo · venue discovery"}
    onMap={widget.venues.length ? () => map?.showPlaces(widget.venues) : undefined}>
    <div className={styles.list}>{widget.venues.map((venue, index) => <div key={venue.id ?? `${venue.longitude}:${venue.latitude}`} className={styles.entry}><div className={styles.venue}>
      {(venue.image || (venue.source === "Qloo" && canResolveEntityImage(venue.id))) && <EntityImage className={styles.photo} src={venue.image} entityId={venue.source === "Qloo" ? venue.id : undefined} label={venue.name} />}
      <button type="button" className={styles.place} onClick={() => map?.showPlaces(widget.venues, index)}>
        {!venue.image && !(venue.source === "Qloo" && canResolveEntityImage(venue.id)) && <MapPin size={15} />}<span><strong>{venue.name}</strong>{venue.address && <small>{venue.address}</small>}</span>
      </button>
      {venue.affinity !== undefined && <VenueAffinity value={venue.affinity} />}
      {venue.website && <a href={venue.website} target="_blank" rel="noopener noreferrer" aria-label={`${venue.name} website`}><ExternalLink size={13} /></a>}
    </div><VenueEvidence place={venue} /></div>)}</div>
    {!widget.venues.length && <button type="button" className={styles.expand} disabled={map?.busy} onClick={() => map?.ask(`Expand the venue search around ${widget.area.name} to ${widget.area.radius * 2 / 1000} km.`)}>Expand search to {widget.area.radius * 2 / 1000} km</button>}
  </AudienceWidgetShell>;
}
