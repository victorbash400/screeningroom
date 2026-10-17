import { Check, ChevronRight, FolderClosed, Square } from "lucide-react";
import type { FileNode } from "../../lib/types";
import { fileIcon } from "../../lib/fileTypes";
import styles from "./ReferencePickerRow.module.css";
export default function ReferencePickerRow({ node, selected, included, onToggle, onOpen }: {
  node: FileNode; selected: boolean; included: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const Icon = node.kind === "folder" ? FolderClosed : fileIcon(node.name, node.sourceUrl, node.mimeType);
  return <div className={`${styles.row} ${selected || included ? styles.selected : ""}`}>
    <button type="button" role="checkbox" aria-checked={selected || included} aria-label={`Select ${node.name}`}
      disabled={included} className={styles.toggle} onClick={onToggle}>
      {selected || included ? <Check size={16} /> : <Square size={16} />}
    </button>
    <button type="button" className={styles.name} disabled={included && node.kind === "file"} onClick={node.kind === "folder" ? onOpen : onToggle}>
      <Icon size={24} strokeWidth={1.7} /><span>{node.name}</span>
      {node.kind === "folder" && <ChevronRight size={14} />}
    </button>
    <time className={styles.date} dateTime={node.updatedAt}>{new Date(node.updatedAt).toLocaleDateString()}</time>
  </div>;
}
