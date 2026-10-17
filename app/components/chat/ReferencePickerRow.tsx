import { Check, ChevronRight, FolderClosed, FolderOpen } from "lucide-react";
import type { FileNode } from "../../lib/types";
import { directory } from "../../lib/storage";
import { fileIcon } from "../../lib/fileTypes";
import tree from "../navigation/WorkspaceBranch.module.css";
import styles from "./ReferencePickerRow.module.css";

export default function ReferencePickerRow({ node, nodes, depth, expanded, selected, included = false, onExpand, onToggle }: {
  node: FileNode; nodes: FileNode[]; depth: number; expanded: Set<string>; selected: Set<string>; included?: boolean;
  onExpand: (id: string) => void; onToggle: (node: FileNode) => void;
}) {
  const folder = node.kind === "folder";
  const open = expanded.has(node.id);
  const checked = selected.has(node.id);
  const Icon = folder ? open ? FolderOpen : FolderClosed : fileIcon(node.name, node.sourceUrl, node.mimeType);
  return <>
    <div className={`${tree.row} ${checked ? tree.selected : ""}`} style={{ marginLeft: depth * 20 }}>
      {folder ? <button type="button" className={`${tree.toggle} ${open ? tree.expanded : ""}`}
        aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`} aria-expanded={open} onClick={() => onExpand(node.id)}>
        <ChevronRight size={14} />
      </button> : <span className={tree.toggle} aria-hidden="true" />}
      <button type="button" className={tree.label} onClick={() => folder ? onExpand(node.id) : !included && onToggle(node)}>
        <Icon size={24} strokeWidth={1.7} /><span>{node.name}</span>
      </button>
      <button type="button" role="checkbox" aria-checked={checked || included} aria-label={`Select ${node.name}`}
        disabled={included} className={styles.select} onClick={() => onToggle(node)}>
        <span>{(checked || included) && <Check size={12} />}</span>
      </button>
    </div>
    {folder && open && directory(nodes, node.id).map((child) => <ReferencePickerRow key={child.id} node={child} nodes={nodes}
      depth={depth + 1} expanded={expanded} selected={selected} included={included || checked}
      onExpand={onExpand} onToggle={onToggle} />)}
  </>;
}
