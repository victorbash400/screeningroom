import ErrorNotice from "../shell/ErrorNotice";
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
  onSave: (text: string) => boolean | Promise<boolean>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      queueMicrotask(() => {
        if (
          previous instanceof HTMLElement &&
          previous !== document.body &&
          previous.isConnected
        ) {
          previous.focus();
          return;
        }
        const row = Array.from(
          document.querySelectorAll<HTMLElement>("[data-node-id]"),
        ).find((element) => element.dataset.nodeId === node.id);
        row?.querySelector<HTMLButtonElement>("button")?.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.editor}
      aria-label={`Edit ${node.name}`}
      onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          try { if (await onSave(text)) onClose(); }
          finally { setBusy(false); }
        }}
      >
        <header>{node.name}</header>
        {error && <ErrorNotice message={error} />}
        <textarea
          autoFocus
          aria-label="File content"
          disabled={busy}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={onClose}>
            Close
          </button>
          <button type="submit" disabled={busy}>Save</button>
        </div>
      </form>
    </dialog>
  );
}
