import type { ButtonHTMLAttributes } from "react";
import styles from "./PillButton.module.css";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  secondary?: boolean;
}
export default function PillButton({
  secondary,
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={`${styles.button} ${secondary ? styles.secondary : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
