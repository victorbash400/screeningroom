import SettingsInlineButton from "../settings/SettingsInlineButton";
import styles from "./NotificationActions.module.css";
export default function NotificationActions({
  unread,
  trashed,
  busy,
  onRead,
  onTrash,
}: {
  unread: boolean;
  trashed: boolean;
  busy: boolean;
  onRead: () => void;
  onTrash: () => void;
}) {
  return (
    <div className={styles.actions}>
      {!trashed && unread && (
        <SettingsInlineButton disabled={busy} onClick={onRead}>
          Mark read
        </SettingsInlineButton>
      )}
      <SettingsInlineButton disabled={busy} onClick={onTrash}>
        {trashed ? "Restore" : "Move to trash"}
      </SettingsInlineButton>
    </div>
  );
}
