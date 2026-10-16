import type { CSSProperties } from "react";
import styles from "./LoadingIndicator.module.css";
export default function LoadingIndicator({ size = 18, label = "Loading" }: { size?: number; label?: string }) {
  return <span role="progressbar" aria-label={label} className={styles.indicator} style={{ "--loading-size": `${size}px` } as CSSProperties} />;
}
