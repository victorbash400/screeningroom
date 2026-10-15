import type { ButtonHTMLAttributes } from "react";
import styles from "./SettingsActionRow.module.css";
export default function SettingsActionRow({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={styles.row} {...props}>
      {children}
    </button>
  );
}
