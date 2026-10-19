import type { ReactNode } from "react";
import styles from "./AudienceSurface.module.css";

export default function AudienceSurface({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className={styles.surface} data-open={open} aria-hidden={!open} inert={!open}>{children}</div>;
}
