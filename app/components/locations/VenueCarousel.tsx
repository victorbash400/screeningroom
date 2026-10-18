import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { MapScene } from "../../lib/mapScene";
import styles from "./VenueCarousel.module.css";

export default function VenueCarousel({ scene, onScene }: { scene?: MapScene; onScene: (scene: MapScene) => boolean }) {
  const list = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const places = scene?.presentation.locations ?? [];
  const selected = scene?.presentation.focusIndex;
  function measure() {
    const element = list.current;
    if (element) setEdges({ start: element.scrollLeft <= 1, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1 });
  }
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [places]);
  useEffect(() => {
    const element = list.current, card = selected === undefined ? undefined : element?.children[selected];
    if (element && card instanceof HTMLElement) {
      const left = card.offsetLeft - element.offsetLeft;
      if (left < element.scrollLeft) element.scrollTo({ left });
      else if (left + card.offsetWidth > element.scrollLeft + element.clientWidth) element.scrollTo({ left: left + card.offsetWidth - element.clientWidth });
    }
  }, [selected]);
  function move(direction: number) {
    const element = list.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * .85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  if (!places.length) return null;
  return <section className={styles.carousel} role="region" aria-label="Venue shortlist" aria-roledescription="carousel">
    <div className={styles.controls}>
      <button type="button" aria-label="Previous venues" disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={16} /></button>
      <button type="button" aria-label="Next venues" disabled={edges.end} onClick={() => move(1)}><ChevronRight size={16} /></button>
    </div>
    <div ref={list} className={styles.list} onScroll={measure}>
      {places.map((place, index) => <button className={styles.card} type="button" key={place.id ?? `${place.longitude}:${place.latitude}`} aria-pressed={selected === index}
        onClick={() => scene && onScene({ id: crypto.randomUUID(), reframe: true, presentation: { ...scene.presentation, focusIndex: index } })}>
        <MapPin size={17} aria-hidden="true" /><span><strong>{place.name}</strong>{place.address && <small>{place.address}</small>}</span>
        {place.affinity !== undefined && <output aria-label="Qloo venue affinity" title="Qloo venue affinity within this query">{place.affinity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</output>}
      </button>)}
    </div>
  </section>;
}
