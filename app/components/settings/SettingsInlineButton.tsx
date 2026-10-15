import type { ButtonHTMLAttributes } from "react";
import styles from "./SettingsInlineButton.module.css";
export default function SettingsInlineButton({
  primary,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={`${styles.button} ${primary ? styles.primary : ""} ${className}`}
      {...props}
    />
  );
}
