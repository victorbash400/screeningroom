import { MousePointer2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { TourCue, TourTarget } from "./tourScript";
import styles from "./TourCursor.module.css";
const selectors: Record<TourTarget, string> = {
  countryMode: '[aria-label="Area selection"] button:last-child', countrySearch: '[aria-label="Search countries"]', countryChoice: '[aria-label="Countries"] button', radiusValue: '[aria-label="Radius in kilometers"]',
  create: '[data-tour-home] [aria-label="Create workspace"]', workspaceName: '[aria-label="Workspace name"]', confirmWorkspace: '[aria-label="Create workspace"] button[aria-label="Create workspace"]',
  workspace: '[aria-label="Open Night Signals"]', import: 'header [aria-label="Import"]', browse: '[aria-label="Browse files"]', select: '[aria-haspopup="dialog"]',
  trailer: '[aria-label="Select Trailer.mp4"]', briefCheckbox: '[aria-label="Select Production brief.txt"]', done: '[aria-label="Done"]',
  message: '[aria-label="Message"]', send: '[aria-label="Send message"], [aria-label="Stop response"]', map: '[role="switch"][aria-label="Map"]',
  radius: '[aria-label="Search radius"]', venue: '[aria-label="Next venue"]', digital: '[aria-label="Audience format"] button:last-child',
  transcript: '[role="log"]', searchArea: '[aria-label="Search area"]', nextVenue: '[aria-label="Next venue"]',
  comparableTable: '[aria-label="Comparable films · sample"] [role="region"]', venueEvidence: '[aria-label="Venues · London"] details > summary', platformTable: '[aria-label="Platform comparison table"]', catalogue: '[aria-label="Digital platforms"]', venueTool: '[aria-label="Audience venues: done"]',
  platforms: '[role="switch"][aria-label="Platforms"]', evidence: '[aria-label="Qloo search: done"]', match: '[aria-label="Qloo search details"] li',
};
interface Point { x: number; y: number }
export default function TourCursor({ root, cue, time, first }: { root: HTMLDivElement | null; cue: TourCue; time: number; first: boolean }) {
  const last = useRef<Point | null>(null);
  const [path, setPath] = useState({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } });
  useLayoutEffect(() => {
    const element = root;
    if (!element) return;
    const origin = !first && last.current ? last.current : { x: element.offsetWidth * .72, y: element.offsetHeight * .65 };
    const content = new MutationObserver(measure);
    function measure() {
      const target = element!.querySelector<HTMLElement>(selectors[cue.target]);
      if (!target || !target.getClientRects().length) return;
      content.disconnect();
      const frame = element!.getBoundingClientRect(), rect = target.getBoundingClientRect();
      const scale = frame.width / element!.offsetWidth;
      const targetX = cue.target === "radius" && target instanceof HTMLInputElement && cue.change.radius !== undefined
        ? rect.left + 7 * scale + (rect.width - 14 * scale) * (cue.change.radius - Number(target.min)) / (Number(target.max) - Number(target.min))
        : rect.left + rect.width / 2;
      const point = { x: Math.max(16, Math.min(element!.offsetWidth - 24, (targetX - frame.left) / scale)), y: Math.max(16, Math.min(element!.offsetHeight - 24, (rect.top + rect.height / 2 - frame.top) / scale)) };
      setPath({ from: origin, to: point });
      last.current = point;
    }
    if (element.firstElementChild) content.observe(element.firstElementChild, { childList: true, subtree: true });
    measure();
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); content.disconnect(); };
  }, [cue, root, first]);
  const progress = Math.max(0, Math.min(1, (time - cue.at) / 480));
  const eased = progress * progress * (3 - 2 * progress);
  const x = path.from.x + (path.to.x - path.from.x) * eased;
  const y = path.from.y + (path.to.y - path.from.y) * eased;
  const click = Math.max(0, Math.min(1, (time - cue.commit) / 450));
  return <div className={styles.cursor} aria-hidden="true" data-clicking={cue.click && time >= cue.commit && click < 1} style={{ transform: `translate(${x}px, ${y}px)` }}>
    {cue.click && time >= cue.commit && click < 1 && <span className={styles.ripple} style={{ opacity: 1 - click, transform: `translate(-50%, -50%) scale(${.5 + click})` }} />}
    <MousePointer2 size={27} strokeWidth={1.7} fill="white" />
  </div>;
}
