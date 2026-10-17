import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FileNode } from "../../lib/types";
import ReferenceChip from "./ReferenceChip";
import styles from "./SelectedFiles.module.css";

export default function SelectedFiles({ nodes, onRemove }: {
  nodes: FileNode[]; onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  if (!nodes.length) return null;
  const extra = Math.max(0, nodes.length - 2);
  const visible = expanded ? nodes : nodes.slice(0, 2);
  return <div className={styles.tray}>
    <div id={id} className={styles.chips} data-expanded={expanded} data-overflow={extra > 0}>
      {visible.map((node) => <ReferenceChip key={node.id} node={node} onRemove={() => onRemove(node.id)} />)}
    </div>
    {extra > 0 && <button type="button" className={styles.expand} aria-label={expanded ? "Collapse files" : `Show ${extra} more ${extra === 1 ? "file" : "files"}`}
      aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      {!expanded && <span>+{extra}</span>}{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
    </button>}
  </div>;
}
