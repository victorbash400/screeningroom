import { FolderClosed, X } from "lucide-react";
import { fileIcon } from "../../lib/fileTypes";
import type { FileNode } from "../../lib/types";
import IconButton from "../controls/IconButton";
import styles from "./ReferenceChip.module.css";
export default function ReferenceChip({
  node,
  onRemove,
}: {
  node: FileNode;
  onRemove: () => void;
}) {
  const Icon = node.kind === "folder" ? FolderClosed : fileIcon(node.name, node.sourceUrl, node.mimeType);
  return (
    <div className={styles.chip}>
      <Icon size={18} />
      <span>{node.name}</span>
      <IconButton label={`Remove ${node.name}`} onClick={onRemove}>
        <X />
      </IconButton>
    </div>
  );
}
