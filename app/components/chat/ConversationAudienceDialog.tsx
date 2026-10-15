import { useEffect, useRef } from "react";
import { useAccount } from "../../state/AccountContext";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./ConversationAudienceDialog.module.css";
export default function ConversationAudienceDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { user } = useAccount();
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
      aria-label="Local conversation"
      onCancel={onClose}
    >
      <h2>Local conversation</h2>
      <div>{user?.name || user?.email || "You"}</div>
      <footer>
        <SettingsInlineButton onClick={onClose}>Done</SettingsInlineButton>
      </footer>
    </dialog>
  );
}
