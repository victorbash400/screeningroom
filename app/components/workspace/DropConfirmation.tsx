import { useEffect, useRef, useState } from "react";
import { ChevronRight, FolderClosed } from "lucide-react";
import PillButton from "../controls/PillButton";
import { useDialogBackdrop } from "../../state/useDialogBackdrop";
import styles from "./DropConfirmation.module.css";

export interface DropRequest {
  kind: "move" | "import";
  names: string[];
  destination: string[];
  run: () => boolean | Promise<boolean>;
}
export default function DropConfirmation({
  request,
  error,
  onClose,
}: {
  request: DropRequest;
  error: string | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const dismiss = () => {
    if (!busy) onClose();
  };
  const backdrop = useDialogBackdrop(dismiss);
  const action = request.kind === "move" ? "Move" : "Import";
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={`${action} dropped items`}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      {...backdrop}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setFailure(null);
          try {
            if (await request.run()) onClose();
          } catch (cause) {
            setFailure(
              cause instanceof Error ? cause.message : `${action} failed.`,
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>
          {action}{" "}
          {request.names.length === 1
            ? request.names[0]
            : `${request.names.length} items`}
          ?
        </h2>
        <div
          className={styles.destination}
          aria-label={`To ${request.destination.join(" / ")}`}
        >
          <FolderClosed size={17} aria-hidden="true" />
          {request.destination.map((name, index) => (
            <span key={index}>
              {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
              {name}
            </span>
          ))}
        </div>
        {request.names.length > 1 && (
          <ul>
            {request.names.slice(0, 5).map((name, index) => (
              <li key={index}>{name}</li>
            ))}
            {request.names.length > 5 && <li>+{request.names.length - 5}</li>}
          </ul>
        )}
        {(error || failure) && <p role="alert">{failure || error}</p>}
        <div className={styles.actions}>
          <PillButton secondary autoFocus disabled={busy} onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton type="submit" disabled={busy}>
            {busy ? `${action === "Move" ? "Moving" : "Importing"}…` : action}
          </PillButton>
        </div>
      </form>
    </dialog>
  );
}
