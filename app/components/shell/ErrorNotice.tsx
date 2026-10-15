import { X } from "lucide-react";
import IconButton from "../controls/IconButton";
import styles from "./ErrorNotice.module.css";
export default function ErrorNotice({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="alert" className={styles.notice}>
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
      <IconButton label="Dismiss error" onClick={onDismiss}>
        <X />
      </IconButton>
    </div>
  );
}
