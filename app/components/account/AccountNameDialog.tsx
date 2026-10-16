import ErrorNotice from "../shell/ErrorNotice";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "../../state/AccountContext";
import AccountField from "./AccountField";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./AccountNameDialog.module.css";
export default function AccountNameDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(account.user?.name ?? "");
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
      aria-label="Edit name"
      onCancel={(event) => {
        if (account.busy) event.preventDefault();
        else onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (name.trim() && (await account.saveName(name.trim()))) onClose();
        }}
      >
        <AccountField
          label="Name"
          autoFocus
          autoComplete="name"
          required
          value={name}
          disabled={account.busy}
          onChange={(event) => setName(event.target.value)}
        />
        {account.error && <ErrorNotice message={account.error} onDismiss={() => account.setError(null)} />}
        <div className={styles.actions}>
          <SettingsInlineButton disabled={account.busy} onClick={onClose}>
            Cancel
          </SettingsInlineButton>
          <SettingsInlineButton
            primary
            type="submit"
            disabled={account.busy || !name.trim()}
          >
            {account.busy ? "Saving…" : "Save"}
          </SettingsInlineButton>
        </div>
      </form>
    </dialog>
  );
}
