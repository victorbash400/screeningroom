import styles from "./ChatLoadingIndicator.module.css";

export default function ChatLoadingIndicator() {
  return <span className={styles.indicator} role="status" aria-label="Waiting for answer"><span /></span>;
}
