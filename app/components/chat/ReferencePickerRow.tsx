import { ChevronRight, FolderClosed } from "lucide-react";
import type { FileNode } from "../../lib/types";
import { fileIcon } from "../../lib/fileTypes";
import styles from "./ReferencePickerRow.module.css";
export default function ReferencePickerRow({
  node,
  onSelect,
}: {
  node: FileNode;
  onSelect: () => void;
}) {
  const Icon = node.kind === "folder" ? FolderClosed : fileIcon(node.name, node.sourceUrl, node.mimeType);
  return (
    <button className={styles.row} onClick={onSelect}>
      <Icon size={20} strokeWidth={1.7} />
      <span>{node.name}</span>
      {node.kind === "folder" && <ChevronRight size={14} />}
    </button>
  );
}
