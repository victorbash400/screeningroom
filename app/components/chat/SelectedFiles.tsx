import type { FileNode } from "../../lib/types";
import ReferenceChip from "./ReferenceChip";
import styles from "./SelectedFiles.module.css";

export default function SelectedFiles({ nodes, onSelect, onRemove }: {
  nodes: FileNode[]; onSelect: () => void; onRemove: (id: string) => void;
}) {
  return <div className={styles.tray}>
    <button type="button" className={styles.label} onClick={onSelect}>Selected ({nodes.length})</button>
    {nodes.length > 0 && <div className={styles.chips}>{nodes.map((node) =>
      <ReferenceChip key={node.id} node={node} onRemove={() => onRemove(node.id)} />,
    )}</div>}
  </div>;
}
