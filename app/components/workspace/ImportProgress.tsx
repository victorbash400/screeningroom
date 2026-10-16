import type { ImportProgress as Progress } from "../../lib/importFiles";
import styles from "./ImportProgress.module.css";

export default function ImportProgress({ progress }: { progress: Progress | null }) {
  const fraction = progress
    ? progress.totalBytes > 0 ? progress.completedBytes / progress.totalBytes : progress.completedItems / Math.max(1, progress.totalItems)
    : 0;
  const determinate = progress !== null && fraction > 0;
  return (
    <div className={styles.progress}>
      <div className={styles.track} role="progressbar" aria-label="Import progress"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={determinate ? Math.round(fraction * 100) : undefined}>
        <div className={determinate ? styles.fill : styles.pending} style={determinate ? { width: `${fraction * 100}%` } : undefined} />
      </div>
      <span>{progress?.name || "Preparing import…"}</span>
      {determinate && <output>{Math.round(fraction * 100)}%</output>}
    </div>
  );
}
