import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./ResearchWidgetFrame.module.css";

export default function ResearchWidgetFrame({ title, source, basis, children }: { title: string; source: string; basis: string; children: ReactNode }) {
  return <section className={styles.frame} aria-label={title}>
    <header>{title}</header>{children}
    <footer>{source}</footer>
    <details><summary>About this result<ChevronDown size={13} aria-hidden="true" /></summary><p>{basis}</p></details>
  </section>;
}
