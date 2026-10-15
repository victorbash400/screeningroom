import { Bell } from "lucide-react";
import styles from "./NotificationIcon.module.css";
export default function NotificationIcon({ unread }: { unread: boolean }) {
  return (
    <span
      className={styles.icon}
      aria-label={unread ? "Unread notification" : "Read notification"}
    >
      <Bell size={18} />
      {unread && <span />}
    </span>
  );
}
