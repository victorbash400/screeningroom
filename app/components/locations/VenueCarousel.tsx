import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import type { MapScene } from "../../lib/mapScene";
import styles from "./VenueCarousel.module.css";

export default function VenueCarousel({ scene, onScene }: { scene?: MapScene; onScene: (scene: MapScene) => boolean }) {
  const list = useRef<HTMLDivElement>(null);
  const places = scene?.presentation.locations ?? [];
  const selected = scene?.presentation.focusIndex;
  useEffect(() => { if (selected !== undefined) list.current?.children[selected]?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [selected]);
  if (!places.length) return null;
  return <div ref={list} className={styles.list} role="region" aria-label="Venue shortlist">
    {places.map((place, index) => <button type="button" key={place.id ?? `${place.longitude}:${place.latitude}`} aria-pressed={selected === index}
      onClick={() => scene && onScene({ id: crypto.randomUUID(), reframe: true, presentation: { ...scene.presentation, focusIndex: index } })}>
      <MapPin size={17} aria-hidden="true" /><span><strong>{place.name}</strong>{place.address && <small>{place.address}</small>}</span>
      {place.affinity !== undefined && <output aria-label="Qloo venue affinity" title="Qloo venue affinity within this query">{place.affinity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</output>}
    </button>)}
  </div>;
}
