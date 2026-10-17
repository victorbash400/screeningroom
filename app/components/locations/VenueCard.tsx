import { ExternalLink, MapPin, X } from "lucide-react";
import type { MapPlace } from "../../lib/mapScene";
import styles from "./VenueCard.module.css";

export default function VenueCard({ place, onClose, onSetArea, onAsk, busy }: {
  place: MapPlace; busy?: boolean; onClose: () => void; onSetArea: () => void; onAsk: () => void;
}) {
  return <section className={styles.card} aria-label={place.name} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header><strong>{place.name}</strong><button type="button" onClick={onClose} aria-label="Close venue"><X size={15} /></button></header>
    {place.category && <span>{place.category}</span>}
    {place.address && <p>{place.address}</p>}
    {place.affinity !== undefined && <p>Affinity <strong>{place.affinity.toFixed(2)}</strong></p>}
    <footer>
      <button type="button" onClick={onAsk} disabled={busy}>Ask about this place</button>
      <button type="button" onClick={onSetArea} aria-label="Search around this place" title="Search around this place"><MapPin size={15} /></button>
      {place.website && <a href={place.website} target="_blank" rel="noopener noreferrer" aria-label="Venue website" title="Website"><ExternalLink size={15} /></a>}
    </footer>
    {place.source && <small>{place.source === "OpenStreetMap" ? <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a> : place.source === "Geoapify" ? <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify · © OpenStreetMap</a> : place.source}</small>}
  </section>;
}
