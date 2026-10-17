import { useEffect, useRef, useState } from "react";
import { ChevronRight, FolderClosed, FolderOpen, X } from "lucide-react";
import type { FileNode, Workspace } from "../../lib/types";
import { directory } from "../../lib/storage";
import { selectedReferences } from "../../lib/chatSelection";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import IconButton from "../controls/IconButton";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import ReferencePickerRow from "./ReferencePickerRow";
import modal from "../workspace/ImportDialog.module.css";
import styles from "./ReferencePicker.module.css";
import tree from "../navigation/WorkspaceBranch.module.css";

export default function ReferencePicker({ nodes, workspaces, workspaceId, selectedIds, onSelect, onClose }: {
  nodes: FileNode[]; workspaces: Workspace[]; workspaceId: string; selectedIds: string[];
  onSelect: (ids: string[]) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(typeof document !== "undefined" ? document.activeElement : null);
  const backdrop = useDialogBackdrop(onClose);
  const [expanded, setExpanded] = useState(new Set([workspaceId]));
  const [selected, setSelected] = useState(selectedIds);
  const selectedSet = new Set(selected);
  function expand(id: string) {
    setExpanded((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  const effective = selectedReferences(selected, nodes);
  function toggle(node: FileNode) {
    setSelected((previous) => previous.includes(node.id) ? previous.filter((id) => id !== node.id) : [...previous, node.id]);
  }
  useEffect(() => {
    dialog.current?.showModal();
    return () => { queueMicrotask(() => {
      const previous = previousFocus.current;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    }); };
  }, []);
  return <dialog ref={dialog} className={`${modal.dialog} ${styles.picker}`} aria-label="Select files"
    onCancel={onClose} onKeyDown={(event) => event.stopPropagation()} {...backdrop}>
    <header className={modal.header}>
      <FolderOpen size={20} /><span>Select files</span>
      <IconButton label="Close file picker" onClick={onClose}><X /></IconButton>
    </header>
    <nav className={styles.browser} aria-label="Workspace files">
      {workspaces.map((workspace) => {
        const open = expanded.has(workspace.id);
        const scopedNodes = nodes.filter((node) => node.workspaceId === workspace.id);
        const Icon = open ? FolderOpen : FolderClosed;
        return <div key={workspace.id}>
          <div className={tree.row}>
            <button type="button" className={`${tree.toggle} ${open ? tree.expanded : ""}`}
              aria-label={`${open ? "Collapse" : "Expand"} ${workspace.name}`} aria-expanded={open} onClick={() => expand(workspace.id)}>
              <ChevronRight size={14} />
            </button>
            <button type="button" className={tree.label} onClick={() => expand(workspace.id)}>
              <Icon size={24} strokeWidth={1.7} /><span>{workspace.name}</span>
            </button>
          </div>
          {open && directory(scopedNodes, null).map((node) => <ReferencePickerRow key={node.id} node={node} nodes={scopedNodes}
            depth={1} expanded={expanded} selected={selectedSet} onExpand={expand} onToggle={toggle} />)}
        </div>;
      })}
    </nav>
    <footer className={styles.footer}>
      <span>Selected ({effective.length})</span>
      <SettingsInlineButton onClick={onClose}>Cancel</SettingsInlineButton>
      <SettingsInlineButton primary onClick={() => onSelect(effective.map((node) => node.id))}>Done</SettingsInlineButton>
    </footer>
  </dialog>;
}
