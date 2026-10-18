import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import styles from "./ResearchDisclosure.module.css";

export default function ResearchDisclosure({ title, metadata, open, children }: { title: string; metadata?: string; open?: boolean; children: ReactNode }) {
  return <details className={styles.disclosure} open={open}>
    <summary className={styles.control}><ChevronRight size={14} aria-hidden="true" /><span className={styles.label}>{title}</span>{metadata && <span className={styles.metadata}>{metadata}</span>}</summary>
    {children}
  </details>;
}
