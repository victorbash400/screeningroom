import AppIcon from "../controls/AppIcon";
import LoadingIndicator from "../controls/LoadingIndicator";
import styles from "./SessionLoading.module.css";

export default function SessionLoading() {
  return <div className={styles.page} aria-label="Screeningroom" aria-busy="true"><div className={styles.content}><AppIcon size={36} /><LoadingIndicator /></div></div>;
}
