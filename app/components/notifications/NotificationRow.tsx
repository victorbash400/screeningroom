import type { AccountNotification } from "../../lib/accountTypes";
import NotificationIcon from "./NotificationIcon";
import NotificationActions from "./NotificationActions";
import styles from "./NotificationRow.module.css";
export default function NotificationRow({
  item,
  busy,
  onRead,
  onTrash,
}: {
  item: AccountNotification;
  busy: boolean;
  onRead: () => void;
  onTrash: () => void;
}) {
  const date = new Date(item.createdAt);
  return (
    <div className={styles.row}>
      <NotificationIcon unread={!item.readAt && !item.trashedAt} />
      <div className={styles.content}>
        <span className={styles.title}>{item.title}</span>
        <time dateTime={item.createdAt}>
          {date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ·{" "}
          {date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
        <NotificationActions
          unread={!item.readAt}
          trashed={Boolean(item.trashedAt)}
          busy={busy}
          onRead={onRead}
          onTrash={onTrash}
        />
      </div>
    </div>
  );
}
