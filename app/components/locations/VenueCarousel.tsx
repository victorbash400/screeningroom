import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MapScene } from "../../lib/mapScene";
import VenueCarouselCard from "./VenueCarouselCard";
import styles from "./VenueCarousel.module.css";

export default function VenueCarousel({ scene, onScene }: { scene?: MapScene; onScene: (scene: MapScene) => boolean }) {
  const list = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);
  const places = scene?.presentation.locations ?? [];
  const selected = scene?.presentation.focusIndex;
  const active = Math.min(visible, Math.max(0, places.length - 1));
  function center(index: number) {
    const element = list.current, card = element?.children[index];
    if (element && card instanceof HTMLElement) element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  useEffect(() => { if (selected !== undefined) { setVisible(selected); center(selected); } }, [selected, places]);
  function measure() {
    const element = list.current;
    if (!element) return;
    const middle = element.scrollLeft + element.clientWidth / 2;
    let closest = 0, distance = Infinity;
    Array.from(element.children).forEach((card, index) => {
      if (!(card instanceof HTMLElement)) return;
      const next = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
      if (next < distance) { distance = next; closest = index; }
    });
    setVisible(closest);
  }
  function select(index: number) {
    setVisible(index); center(index);
    if (scene) onScene({ id: crypto.randomUUID(), reframe: true, presentation: { ...scene.presentation, focusIndex: index } });
  }
  if (!places.length) return null;
  return <section className={styles.carousel} role="region" aria-label="Venue shortlist" aria-roledescription="carousel">
    <div className={styles.track}>
    <div ref={list} className={styles.list} onScroll={measure}>
      {places.map((place, index) => <VenueCarouselCard key={place.id ?? `${place.longitude}:${place.latitude}`} place={place} index={index} active={active === index} selected={selected === index} onSelect={() => select(index)} />)}
    </div>
    <button className={styles.previous} type="button" aria-label="Previous venue" disabled={active === 0} onClick={() => select(active - 1)}><ChevronLeft size={24} /></button>
    <button className={styles.next} type="button" aria-label="Next venue" disabled={active === places.length - 1} onClick={() => select(active + 1)}><ChevronRight size={24} /></button>
    </div>
    <div className={styles.controls}>
      <span className={styles.progress} aria-hidden="true"><span style={{ width: `${(active + 1) / places.length * 100}%` }} /></span>
      <output aria-live="polite" aria-atomic="true"><strong>{String(active + 1).padStart(2, "0")}</strong><span>/ {String(places.length).padStart(2, "0")}</span></output>
    </div>
  </section>;
}
