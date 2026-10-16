import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import styles from "./NodeNameDialog.module.css";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
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
  const previousFocus = useRef(typeof document !== "undefined" ? document.activeElement : null);
  const backdrop = useDialogBackdrop(onClose);
  const [name, setName] = useState(initial);
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      queueMicrotask(() => {
        const previous = previousFocus.current;
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={`${action} name`}
      onCancel={onClose}
      {...backdrop}
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
          <ErrorNotice message={error} />
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
