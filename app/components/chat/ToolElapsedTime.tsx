import { useEffect, useState } from "react";
import { mediaTime } from "../../lib/mediaAnalysis";
import styles from "./ToolElapsedTime.module.css";

export default function ToolElapsedTime({ startedAt, endedAt, running }: { startedAt: number; endedAt?: number; running: boolean }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (!running || endedAt !== undefined) return;
    let frame: number;
    let previous = -1;
    function tick() {
      const current = Date.now();
      const second = Math.floor((current - startedAt) / 1000);
      if (second !== previous) { previous = second; setNow(current); }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt, endedAt, running]);
  return <span className={styles.time} aria-hidden="true">{mediaTime(Math.max(0, (endedAt ?? now) - startedAt) / 1000)}</span>;
}
