import { useEffect, useRef, useState } from "react";
import type { FileNode } from "../../lib/types";
import styles from "./FileEditor.module.css";
export default function FileEditor({
  node,
  initial,
  error,
  onSave,
  onClose,
}: {
  node: FileNode;
  initial: string;
  error: string | null;
  onSave: (text: string) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(initial);
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
      className={styles.editor}
      aria-label={`Edit ${node.name}`}
      onCancel={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onSave(text)) onClose();
        }}
      >
        <header>{node.name}</header>
        {error && <p role="alert">{error}</p>}
        <textarea
          autoFocus
          aria-label="File content"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  );
}
