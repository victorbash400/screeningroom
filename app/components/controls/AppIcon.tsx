import styles from "./AppIcon.module.css";

export default function AppIcon({ size = 24 }: { size?: number }) {
  return <span className={styles.icon} style={{ width: size, height: size }} aria-hidden="true" />;
}
