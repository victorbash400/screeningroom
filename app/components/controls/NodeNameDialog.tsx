import { useEffect, useRef, useState } from "react";
import styles from "./NodeNameDialog.module.css";
interface Props {
  action: "Create" | "Rename";
  initial?: string;
  error: string | null;
  onSubmit: (name: string) => boolean;
  onClose: () => void;
}
export default function NodeNameDialog({
  action,
  initial = "",
  error,
  onSubmit,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initial);
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
      aria-label={`${action} name`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && onSubmit(name.trim())) onClose();
        }}
      >
        <label className={styles.field}>
          <span>Name</span>
          <input
            autoFocus
            aria-label="Name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.target.select()}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!name.trim()}>
            {action}
          </button>
        </div>
      </form>
    </dialog>
  );
}
