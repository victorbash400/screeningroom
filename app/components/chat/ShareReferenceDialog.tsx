import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import type { FileNode } from "../../lib/types";
import AccountField from "../account/AccountField";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./ShareReferenceDialog.module.css";
export default function ShareReferenceDialog({
  node,
  workspaceName,
  error,
  onShare,
  onClose,
}: {
  node: FileNode;
  workspaceName: string;
  error: string | null;
  onShare: (message: string) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
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
      aria-label={`Share ${node.name}`}
      onCancel={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onShare(message.trim())) onClose();
        }}
      >
        <h2>Share {node.name}</h2>
        <div className={styles.content}>
          <span>{workspaceName}</span>
          <AccountField
            label="Message (optional)"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            autoFocus
          />
          {error && <ErrorNotice message={error} />}
        </div>
        <div className={styles.actions}>
          <SettingsInlineButton onClick={onClose}>Cancel</SettingsInlineButton>
          <SettingsInlineButton type="submit" primary>
            Share
          </SettingsInlineButton>
        </div>
      </form>
    </dialog>
  );
}
