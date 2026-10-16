import ErrorNotice from "../shell/ErrorNotice";
import { useRoomStore } from "../../state/RoomDataContext";
import SettingsInlineButton from "./SettingsInlineButton";
import ActivityRow from "./ActivityRow";
import styles from "./ActivitySettings.module.css";
export default function ActivitySettings() {
  const room = useRoomStore();
  const entries = room.data.activity ?? [];
  return (
    <div className={styles.activity}>
      <div className={styles.toolbar}>
        <span>{entries.length} events</span>
        <SettingsInlineButton
          disabled={!entries.length}
          onClick={() => room.update((data) => ({ ...data, activity: [] }))}
        >
          Clear
        </SettingsInlineButton>
      </div>
      {room.error && <ErrorNotice message={room.error} onDismiss={() => room.setError(null)} />}
      <div className={styles.table}>
        <div className={styles.header}>
          <span>File</span>
          <span>Action</span>
          <span className={styles.workspace}>Workspace</span>
          <span className={styles.source}>Source</span>
          <span>Time</span>
        </div>
        <div className={styles.entries}>
          {entries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
