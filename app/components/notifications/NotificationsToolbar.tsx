import SettingsInlineButton from "../settings/SettingsInlineButton";
import SettingsPicker from "../settings/SettingsPicker";
import styles from "./NotificationsToolbar.module.css";
export type NotificationFilter = "all" | "unread" | "trash";
export default function NotificationsToolbar({
  filter,
  onFilter,
  oldest,
  onSort,
  unread,
  busy,
  onRefresh,
}: {
  filter: NotificationFilter;
  onFilter: (value: NotificationFilter) => void;
  oldest: boolean;
  onSort: (value: boolean) => void;
  unread: number;
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        {(
          [
            { id: "all", label: "All" },
            { id: "unread", label: unread ? `Unread (${unread})` : "Unread" },
            { id: "trash", label: "Trash" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={filter === item.id}
            onClick={() => onFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <SettingsPicker
          label="Notification sort"
          width={130}
          value={oldest ? "oldest" : "newest"}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ]}
          onChange={(value) => onSort(value === "oldest")}
        />
        <SettingsInlineButton disabled={busy} onClick={onRefresh}>
          Refresh
        </SettingsInlineButton>
      </div>
    </div>
  );
}
