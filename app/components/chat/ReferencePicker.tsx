import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FolderClosed, FolderOpen, X } from "lucide-react";
import type { FileNode, Workspace } from "../../lib/types";
import { directory, folderPath } from "../../lib/storage";
import { selectedReferences } from "../../lib/chatSelection";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import IconButton from "../controls/IconButton";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import ReferencePickerRow from "./ReferencePickerRow";
import modal from "../workspace/ImportDialog.module.css";
import styles from "./ReferencePicker.module.css";

export default function ReferencePicker({ nodes, workspaces, workspaceId, selectedIds, onSelect, onClose }: {
  nodes: FileNode[]; workspaces: Workspace[]; workspaceId: string; selectedIds: string[];
  onSelect: (ids: string[]) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(typeof document !== "undefined" ? document.activeElement : null);
  const backdrop = useDialogBackdrop(onClose);
  const [location, setLocation] = useState({ workspaceId, folderId: null as string | null });
  const [selected, setSelected] = useState(selectedIds);
  const path = folderPath({ nodes }, location.folderId);
  const workspace = workspaces.find((item) => item.id === location.workspaceId);
  const children = directory(nodes.filter((node) => node.workspaceId === location.workspaceId), location.folderId);
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
    <div className={styles.browser}>
      <nav className={styles.workspaces} aria-label="Workspaces">
        {workspaces.map((item) => <button key={item.id} type="button" aria-current={item.id === location.workspaceId ? "page" : undefined}
          onClick={() => setLocation({ workspaceId: item.id, folderId: null })}>
          {item.id === location.workspaceId ? <FolderOpen size={21} /> : <FolderClosed size={21} />}<span>{item.name}</span>
        </button>)}
      </nav>
      <div className={styles.files}>
        <nav className={styles.path} aria-label="Folder path">
          <IconButton label="Parent folder" disabled={!location.folderId}
            onClick={() => setLocation({ ...location, folderId: path.at(-2)?.id ?? null })}><ArrowLeft /></IconButton>
          <button type="button" onClick={() => setLocation({ ...location, folderId: null })}>{workspace?.name}</button>
          {path.map((folder) => <button type="button" key={folder.id}
            onClick={() => setLocation({ ...location, folderId: folder.id })}>{folder.name}</button>)}
        </nav>
        <div className={styles.columns} aria-hidden="true"><span>Name</span><span>Modified</span></div>
        <div className={styles.list}>
          {children.map((node) => <ReferencePickerRow key={node.id} node={node} selected={selected.includes(node.id)}
            included={!selected.includes(node.id) && path.some((folder) => selected.includes(folder.id))}
            onToggle={() => toggle(node)} onOpen={() => setLocation({ ...location, folderId: node.id })} />)}
        </div>
      </div>
    </div>
    <footer className={styles.footer}>
      <span>Selected ({effective.length})</span>
      <SettingsInlineButton onClick={onClose}>Cancel</SettingsInlineButton>
      <SettingsInlineButton primary onClick={() => onSelect(effective.map((node) => node.id))}>Done</SettingsInlineButton>
    </footer>
  </dialog>;
}
