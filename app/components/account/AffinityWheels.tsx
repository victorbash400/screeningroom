import { useEffect, useId, useRef, useState } from "react";
import styles from "./AffinityWheels.module.css";
import AffinityCard from "./AffinityCard";
import {
  affinityCardCount as count,
  affinityLayout,
  affinityPosition,
} from "../../lib/affinityLayout";

const people = [
  "person-1",
  "person-2",
  "person-3",
  "person-4",
  "person-5",
  "person-6",
];
const media = [
  "film-desert",
  "album-fabric",
  "book-stairway",
  "film-city",
  "album-sculpture",
  "book-sun",
];
const indexes = Array.from({ length: count }, (_, index) => index);

export default function AffinityWheels({ dismissed }: { dismissed: boolean }) {
  const id = useId();
  const frame = useRef<SVGSVGElement>(null);
  const elapsedTime = useRef(0);
  const [size, setSize] = useState({ width: 1440, height: 900 });
  useEffect(() => {
    const svg = frame.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const layout = affinityLayout(size.width, size.height);
  const { cardWidth } = layout;
  const centerY = size.height / 2;
  useEffect(() => {
    const svg = frame.current;
    if (!svg) return;
    const groups = [...svg.querySelectorAll<SVGGElement>("[data-card]")];
    const paths = [...svg.querySelectorAll<SVGPathElement>("[data-link]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation = 0;
    let elapsed = elapsedTime.current;
    let previous = 0;
    function draw(time: number) {
      if (previous) elapsed += Math.min(time - previous, 64);
      elapsedTime.current = elapsed;
      previous = time;
      const phase = reduced.matches ? 0 : (elapsed / 90000) * Math.PI * 2;
      const positions = groups.map((group, index) => {
        const right = index >= count;
        const { x, y, rotation } = affinityPosition(
          affinityLayout(size.width, size.height),
          index % count,
          right,
          phase,
        );
        group.setAttribute(
          "transform",
          `translate(${x} ${y}) rotate(${rotation})`,
        );
        return { x, y };
      });
      paths.forEach((path, index) => {
        const source = positions[index];
        const targets = positions
          .slice(count)
          .filter(
            (point) =>
              point.x > size.width / 2 &&
              point.x < size.width &&
              point.y < centerY === source.y < centerY,
          );
        const target = targets.reduce<(typeof positions)[number] | null>(
          (closest, point) =>
            !closest ||
            Math.abs(point.y - source.y) < Math.abs(closest.y - source.y)
              ? point
              : closest,
          null,
        );
        if (!target) {
          path.setAttribute("opacity", "0");
          return;
        }
        const distance = Math.min(
          Math.abs(source.y - centerY),
          Math.abs(target.y - centerY),
        );
        const strength = Math.max(
          0,
          Math.min(
            1,
            (distance - size.height * 0.28) / 55,
            source.x / 40,
            (size.width - target.x) / 40,
          ),
        );
        path.setAttribute("opacity", String(strength * 0.48));
        const a = source.x + cardWidth / 2;
        const b = target.x - cardWidth / 2;
        path.setAttribute(
          "d",
          `M ${a} ${source.y} C ${size.width * 0.4} ${source.y}, ${size.width * 0.6} ${target.y}, ${b} ${target.y}`,
        );
      });
      svg?.setAttribute("data-ready", "true");
      if (!dismissed && !reduced.matches && !document.hidden)
        animation = requestAnimationFrame(draw);
    }
    const resume = () => {
      cancelAnimationFrame(animation);
      previous = 0;
      if (!document.hidden) animation = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      document.removeEventListener("visibilitychange", resume);
      reduced.removeEventListener("change", resume);
    };
  }, [size, cardWidth, centerY, dismissed]);
  return (
    <svg
      ref={frame}
      className={styles.wheels}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden="true"
      data-dismissed={dismissed || undefined}
    >
      <g className={styles.connections}>
        {Array.from({ length: count }, (_, index) => (
          <path
            key={index}
            data-link
            fill="none"
            stroke="#c4b8ab"
            strokeWidth=".75"
          />
        ))}
      </g>
      {[people, media].map((assets, side) => (
        <g key={side} className={side ? styles.right : styles.left}>
          {indexes.map((index) => (
            <AffinityCard
              key={index}
              asset={assets[index % assets.length]}
              width={cardWidth}
              cropId={`${id}-${side}-${index}`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
