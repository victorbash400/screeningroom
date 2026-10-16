import ErrorNotice from "../shell/ErrorNotice";
import { useAccountNotifications } from "../../state/useAccountNotifications";
import { useState } from "react";
import { useAccount } from "../../state/AccountContext";
import SettingsGroup from "../settings/SettingsGroup";
import type { NotificationFilter } from "./NotificationsToolbar";
import NotificationsToolbar from "./NotificationsToolbar";
import PillButton from "../controls/PillButton";
import NotificationRow from "./NotificationRow";
import styles from "./Notifications.module.css";
export default function Notifications() {
  const account = useAccount();
  const notifications = useAccountNotifications(account.user?.id, account.request);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [oldest, setOldest] = useState(false);
  const items = notifications.items
    .filter((item) =>
      filter === "trash"
        ? Boolean(item.trashedAt)
        : !item.trashedAt && (filter === "all" || !item.readAt),
    )
    .toSorted(
      (a, b) =>
        (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * (oldest ? 1 : -1),
    );
  if (!account.user)
    return (
      <PillButton onClick={() => account.open("auth")}>Sign in</PillButton>
    );
  return (
    <div className={styles.surface}>
      <NotificationsToolbar
        filter={filter}
        onFilter={setFilter}
        oldest={oldest}
        onSort={setOldest}
        unread={notifications.unread}
        busy={notifications.loading || notifications.updating}
        onRefresh={() => {
          void notifications.load();
        }}
      />
      {(notifications.error || items.length > 0) && (
        <SettingsGroup>
          {notifications.error && (
            <ErrorNotice message={notifications.error} onRetry={() => void notifications.load()} />
          )}
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              busy={notifications.updating}
              onTrash={() => {
                void notifications.setTrashed(item.id, !item.trashedAt);
              }}
              onRead={() => {
                void notifications.markRead(item.id);
              }}
            />
          ))}
        </SettingsGroup>
      )}
      {notifications.cursor && (
        <PillButton
          secondary
          disabled={notifications.loading}
          onClick={() => {
            if (notifications.cursor)
              void notifications.load(notifications.cursor);
          }}
        >
          Load more
        </PillButton>
      )}
    </div>
  );
}
