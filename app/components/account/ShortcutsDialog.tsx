import { useEffect, useRef } from "react";
import styles from "./ShortcutsDialog.module.css";
export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
      aria-label="Keyboard shortcuts"
      onCancel={onClose}
    >
      <h2>Keyboard shortcuts</h2>
      <dl>
        {[
          ["Icon view", "⌘1"],
          ["List view", "⌘2"],
          ["Column view", "⌘3"],
          ["Open selection", "⌘O"],
          ["Rename selection", "Enter"],
          ["New folder", "⌘⇧N"],
          ["Settings", "⌘,"],
        ].map(([label, shortcut]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{shortcut}</dd>
          </div>
        ))}
      </dl>
      <button onClick={onClose}>Done</button>
    </dialog>
  );
}
