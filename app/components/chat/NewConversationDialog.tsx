import { useEffect, useRef, useState } from "react";
import AccountField from "../account/AccountField";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./NewConversationDialog.module.css";
export default function NewConversationDialog({
  error,
  onCreate,
  onClose,
}: {
  error: string | null;
  onCreate: (name: string) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      queueMicrotask(() => {
        if (
          previous instanceof HTMLElement &&
          previous !== document.body &&
          previous.isConnected
        )
          previous.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="New conversation"
      onCancel={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onCreate(name.trim())) onClose();
        }}
      >
        <h2>New conversation</h2>
        <AccountField
          label="Name (optional)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          maxLength={100}
        />
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <SettingsInlineButton onClick={onClose}>Cancel</SettingsInlineButton>
          <SettingsInlineButton primary type="submit">
            Open conversation
          </SettingsInlineButton>
        </div>
      </form>
    </dialog>
  );
}
