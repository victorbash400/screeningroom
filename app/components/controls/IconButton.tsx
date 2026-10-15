import type { ButtonHTMLAttributes } from "react";
import styles from "./IconButton.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
}
export default function IconButton({
  label,
  selected,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      className={`${styles.button} ${selected ? styles.selected : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
