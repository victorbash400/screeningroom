import { useLayoutEffect, useRef, type RefObject } from "react";
import type { TourScene, TourScrollAnchor } from "./tourScript";

const anchors: Record<Exclude<TourScrollAnchor, "start" | "end">, string> = {
  venues: '[aria-label="Venues · London"]', platformResults: '[aria-label="Platform affinity · sample"]', comparables: '[aria-label="Comparable films · sample"]',
  followup: '[data-message-id="tour-followup"]', searchDetails: '[aria-label="Qloo search: done"]', venueDetails: '[aria-label="Audience venues: done"]',
};
function apply(root: HTMLElement, scene: TourScene) {
  for (const [name, selected] of [["Qloo search", "search"], ["Audience venues", "venues"], ["Digital audience", "digital"]] as const) {
    const disclosure = root.querySelector(`[aria-label="${name}: done"]`)?.closest("details");
    if (disclosure) disclosure.open = scene.evidenceOpen && scene.evidenceTool === selected;
  }
  const why = root.querySelector<HTMLDetailsElement>('[aria-label="Venues · London"] details');
  if (why) why.open = scene.venueEvidenceOpen;
  const list = root.querySelector<HTMLElement>('[role="log"]');
  const visibleHeight = list?.clientHeight ?? 0;
  const evidence = root.querySelector<HTMLElement>('[aria-label="Audience venues details"]');
  if (evidence) {
    if (visibleHeight) evidence.style.maxHeight = `${Math.max(80, visibleHeight - 52)}px`;
    const query = evidence.querySelector<HTMLDetailsElement>(":scope > details");
    if (query) query.open = scene.evidenceQueryOpen;
    evidence.scrollTop = scene.evidenceScroll * (evidence.scrollHeight - evidence.clientHeight);
  }
  const venues = root.querySelector<HTMLElement>('[aria-label="Venue results"]');
  if (venues && visibleHeight) venues.style.maxHeight = `${Math.max(100, visibleHeight - 70)}px`;
  if (list && list.offsetHeight > 0) {
    const maximum = Math.max(0, list.scrollHeight - list.clientHeight);
    const scale = list.getBoundingClientRect().height / list.offsetHeight;
    const position = (anchor: TourScrollAnchor) => {
      if (anchor === "start") return 0;
      if (anchor === "end") return maximum;
      const target = list.querySelector<HTMLElement>(anchors[anchor]);
      return target ? Math.max(0, Math.min(maximum, list.scrollTop + (target.getBoundingClientRect().top - list.getBoundingClientRect().top) / scale - 10)) : 0;
    };
    const from = position(scene.scrollFrom), to = position(scene.scrollTo);
    list.scrollTop = from + (to - from) * scene.scrollProgress;
  }
  if (venues) venues.scrollTop = scene.venueListScroll * (venues.scrollHeight - venues.clientHeight);
  const catalogue = root.querySelector<HTMLElement>('[aria-label="Digital platforms"]');
  if (catalogue) catalogue.scrollTop = scene.catalogueScroll * (catalogue.scrollHeight - catalogue.clientHeight);
  const comparison = root.querySelector<HTMLElement>('[aria-label="Platform comparison table"]');
  if (comparison) comparison.scrollLeft = scene.comparisonScroll * (comparison.scrollWidth - comparison.clientWidth);
  const comparables = root.querySelector<HTMLElement>('[aria-label="Comparable films · sample"] [role="region"]');
  if (comparables) comparables.scrollLeft = scene.comparableScroll * (comparables.scrollWidth - comparables.clientWidth);
}
export function useTourScroll(root: RefObject<HTMLElement | null>, scene: TourScene) {
  const current = useRef(scene);
  useLayoutEffect(() => { current.current = scene; if (root.current) apply(root.current, scene); });
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => apply(element, current.current));
    observer.observe(element);
    return () => observer.disconnect();
  }, [root]);
}
