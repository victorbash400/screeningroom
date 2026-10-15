import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ActivityEntry } from "../../lib/types";
import styles from "./ActivityRow.module.css";
export default function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const date = new Date(entry.createdAt);
  return (
    <div className={styles.entry}>
      <button
        className={styles.row}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <Chevron size={13} />
        <span className={styles.name}>{entry.name.split("/").at(-1)}</span>
        <span className={styles.action}>{entry.action}</span>
        <span className={styles.workspace}>{entry.workspace}</span>
        <span className={styles.source}>Screeningroom</span>
        <time dateTime={entry.createdAt}>
          {date.toLocaleTimeString(undefined, { hour12: false })}
        </time>
      </button>
      {expanded && (
        <div className={styles.details}>
          {entry.name.includes("/") && <span>{entry.name}</span>}
          <time dateTime={entry.createdAt}>{date.toLocaleString()}</time>
          {entry.bytes > 0 && <span>{entry.bytes} bytes</span>}
        </div>
      )}
    </div>
  );
}
