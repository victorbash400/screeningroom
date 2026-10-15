import { useState } from "react";
import { useAccount } from "../../state/AccountContext";
import SettingsGroup from "../settings/SettingsGroup";
import SettingsRow from "../settings/SettingsRow";
import SettingsActionRow from "../settings/SettingsActionRow";
import SettingsInlineButton from "../settings/SettingsInlineButton";
import DeleteAccountDialog from "./DeleteAccountDialog";
import AccountNameDialog from "./AccountNameDialog";
import styles from "./AccountSettings.module.css";
export default function AccountSettings() {
  const account = useAccount();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!account.user)
    return (
      <SettingsInlineButton onClick={() => account.open("auth")}>
        Sign in
      </SettingsInlineButton>
    );
  return (
    <div className={styles.settings}>
      <SettingsGroup>
        <SettingsRow label="Name">
          <span>{account.user.name}</span>
          <SettingsInlineButton
            disabled={account.busy}
            onClick={() => {
              account.setError(null);
              setEditing(true);
            }}
          >
            Edit
          </SettingsInlineButton>
        </SettingsRow>
        <SettingsRow label="Email">
          <span>{account.user.email}</span>
        </SettingsRow>
        <SettingsActionRow
          disabled={account.busy}
          onClick={() => {
            account.setError(null);
            setDeleting(true);
          }}
        >
          Delete account
        </SettingsActionRow>
        <SettingsActionRow
          disabled={account.busy}
          onClick={() => {
            void account.signOut();
          }}
        >
          Sign out
        </SettingsActionRow>
      </SettingsGroup>
      {account.error && !editing && !deleting && (
        <p role="alert">{account.error}</p>
      )}
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
      {editing && <AccountNameDialog onClose={() => setEditing(false)} />}
    </div>
  );
}
