import type { ReactNode } from "react";
import styles from "./AudienceWidgetShell.module.css";

export default function AudienceWidgetShell({ title, source, children, onMap }: { title: string; source: string; children: ReactNode; onMap?: () => void }) {
  return <section className={styles.widget} aria-label={title}>
    <header><strong>{title}</strong>{onMap && <button type="button" onClick={onMap}>View map</button>}</header>
    {children}
    <footer>{source}</footer>
  </section>;
}
