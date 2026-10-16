import { useEffect, useId, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import PillButton from "../controls/PillButton";
import styles from "./ErrorPopup.module.css";

export default function ErrorPopup({ message, onDismiss, onRetry }: {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    dismissButton.current?.focus({ preventScroll: true });
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-label="Error"
      aria-describedby={messageId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <TriangleAlert className={styles.icon} aria-hidden="true" />
      <p id={messageId} className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {onRetry && <PillButton secondary onClick={onRetry}>Retry</PillButton>}
        <PillButton ref={dismissButton} autoFocus onClick={onDismiss}>OK</PillButton>
      </div>
    </dialog>
  );
}
