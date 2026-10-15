import type { ReactNode } from "react";
import styles from "./SettingsGroup.module.css";
export default function SettingsGroup({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>;
}
