import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "../../state/AccountContext";
import AccountField from "./AccountField";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./DeleteAccountDialog.module.css";
export default function DeleteAccountDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const confirmed =
    email.trim().toLowerCase() === account.user?.email.toLowerCase();
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
      aria-label="Delete account?"
      onCancel={(event) => {
        if (account.busy) event.preventDefault();
        else onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            confirmed &&
            !account.busy &&
            (await account.deleteAccount(email.trim()))
          )
            onClose();
        }}
      >
        <h2>Delete account?</h2>
        <p>
          Deletes your account, cloud files, and this browser’s saved workspaces
          and conversations.
        </p>
        <AccountField
          label="Enter your account email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={account.busy}
          autoFocus
        />
        {account.error && <ErrorNotice message={account.error} onDismiss={() => account.setError(null)} />}
        <div className={styles.actions}>
          <SettingsInlineButton disabled={account.busy} onClick={onClose}>
            Cancel
          </SettingsInlineButton>
          <SettingsInlineButton
            primary
            type="submit"
            disabled={account.busy || !confirmed}
          >
            {account.busy ? "Deleting…" : "Delete account"}
          </SettingsInlineButton>
        </div>
      </form>
    </dialog>
  );
}
