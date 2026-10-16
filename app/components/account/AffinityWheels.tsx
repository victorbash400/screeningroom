import { useEffect, useId, useRef, useState } from "react";
import styles from "./AffinityWheels.module.css";
import AffinityCard from "./AffinityCard";
import { affinityCardCount, affinityLayout } from "../../lib/affinityLayout";
import { affinityPeople, affinityMedia } from "../../lib/affinityAssets";
import { useAffinityAnimation } from "../../state/useAffinityAnimation";
const indexes = Array.from({ length: affinityCardCount }, (_, index) => index);

export default function AffinityWheels({ dismissed }: { dismissed: boolean }) {
  const id = useId();
  const frame = useRef<SVGSVGElement>(null);
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
  useAffinityAnimation(frame, size, dismissed);
  const { cardWidth } = affinityLayout(size.width, size.height);
  return (
    <svg
      ref={frame}
      className={styles.wheels}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden="true"
      data-dismissed={dismissed || undefined}
    >
      {[affinityPeople, affinityMedia].map((assets, side) => (
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
