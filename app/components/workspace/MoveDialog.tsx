import ErrorNotice from "../shell/ErrorNotice";
import { ChevronLeft, FolderClosed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FileNode } from "../../lib/types";
import { directory } from "../../lib/storage";
import IconButton from "../controls/IconButton";
import styles from "./MoveDialog.module.css";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
export default function MoveDialog({
  node,
  nodes,
  workspaceName,
  error,
  onMove,
  onClose,
}: {
  node: FileNode;
  nodes: FileNode[];
  workspaceName: string;
  error: string | null;
  onMove: (parentId: string | null) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdrop = useDialogBackdrop(onClose);
  const [path, setPath] = useState<FileNode[]>([]);
  const parentId = path.at(-1)?.id ?? null;
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
      className={styles.dialog}
      aria-label={`Move ${node.name}`}
      onCancel={onClose}
      {...backdrop}
    >
      <div className={styles.body}>
        <header>
          <IconButton
            label="Parent folder"
            disabled={!path.length}
            onClick={() => setPath(path.slice(0, -1))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span>{path.at(-1)?.name ?? workspaceName}</span>
        </header>
        {error && <ErrorNotice message={error} />}
        <div className={styles.folders}>
          {directory(
            nodes.filter((item) => item.workspaceId === node.workspaceId),
            parentId,
          )
            .filter((item) => item.kind === "folder" && item.id !== node.id)
            .map((folder) => (
              <button
                key={folder.id}
                onClick={() => setPath([...path, folder])}
              >
                <FolderClosed size={18} />
                {folder.name}
              </button>
            ))}
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={onClose}>Cancel</button>
        <button
          onClick={() => {
            if (onMove(parentId)) onClose();
          }}
        >
          Move here
        </button>
      </div>
    </dialog>
  );
}
