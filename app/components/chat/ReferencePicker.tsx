import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { FileNode } from "../../lib/types";
import { directory } from "../../lib/storage";
import IconButton from "../controls/IconButton";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import ReferencePickerRow from "./ReferencePickerRow";
import styles from "./ReferencePicker.module.css";
export default function ReferencePicker({
  nodes,
  workspaceName,
  onSelect,
  onClose,
}: {
  nodes: FileNode[];
  workspaceName: string;
  onSelect: (node: FileNode) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [path, setPath] = useState<FileNode[]>([]);
  const folder = path.at(-1);
  const children = directory(nodes, folder?.id ?? null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.picker}
      aria-label="Mention file or folder"
      onCancel={onClose}
    >
      <h2>Mention file or folder</h2>
      <div className={styles.content}>
        <header>
          <IconButton
            label="Parent folder"
            disabled={!path.length}
            onClick={() => setPath(path.slice(0, -1))}
          >
            <ArrowLeft />
          </IconButton>
          <span>{folder?.name ?? workspaceName}</span>
        </header>
        <div className={styles.list}>
          {children.map((node) => (
            <ReferencePickerRow
              key={node.id}
              node={node}
              onSelect={() =>
                node.kind === "folder"
                  ? setPath([...path, node])
                  : onSelect(node)
              }
            />
          ))}
        </div>
      </div>
      <footer>
        {folder && (
          <SettingsInlineButton onClick={() => onSelect(folder)}>
            Mention this folder
          </SettingsInlineButton>
        )}
        <SettingsInlineButton onClick={onClose}>Cancel</SettingsInlineButton>
      </footer>
    </dialog>
  );
}
