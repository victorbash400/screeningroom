import type { ReactNode } from "react";
import styles from "./WorkspaceSurface.module.css";
export default function WorkspaceSurface({
  toolbar,
  browser,
  chat,
  details,
  count,
}: {
  toolbar: ReactNode;
  browser: ReactNode;
  chat?: ReactNode;
  details?: ReactNode;
  count: number;
}) {
  return (
    <main className={styles.surface} aria-label="Workspace">
      {toolbar}
      <div className={styles.content}>
        {browser}
        {chat || details}
      </div>
      <footer className={styles.status}>
        {count} {count === 1 ? "item" : "items"}
      </footer>
    </main>
  );
}
