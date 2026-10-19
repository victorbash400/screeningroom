import ResearchDisclosure from "./ResearchDisclosure";
import type { ReactNode } from "react";
import styles from "./ResearchWidgetFrame.module.css";

export default function ResearchWidgetFrame({ title, source, basis, sourceInDetails = false, detailsInTool = false, children }: { title: string; source: string; basis: string; sourceInDetails?: boolean; detailsInTool?: boolean; children: ReactNode }) {
  return <section className={styles.frame} aria-label={title}>
    <header>{title}</header>{children}
    {!sourceInDetails && <footer>{source}</footer>}
    {!detailsInTool && <ResearchDisclosure title="About this result"><div className={styles.basis}>{sourceInDetails && <p className={styles.source}>{source}</p>}<p>{basis}</p></div></ResearchDisclosure>}
  </section>;
}
