import { useEffect, useRef } from "react";
import styles from "./DeleteDialog.module.css";
export default function DeleteDialog({
  name,
  onDelete,
  onClose,
  error,
}: {
  error?: string | null;
  name: string;
  onDelete: () => boolean;
  onClose: () => void;
}) {
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
      aria-label={`Delete ${name}?`}
      onCancel={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onDelete()) onClose();
        }}
      >
        <span>Delete {name}?</span>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" autoFocus onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Delete</button>
        </div>
      </form>
    </dialog>
  );
}
