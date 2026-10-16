import Link from "next/link";
import AppIcon from "../controls/AppIcon";
import PillButton from "../controls/PillButton";
import styles from "./UnavailablePage.module.css";

export default function UnavailablePage({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="unavailable-title">
        <AppIcon />
        <span className={styles.code}>404</span>
        <h1 id="unavailable-title">{message ? "Couldn’t open Screeningroom" : "Page not found"}</h1>
        {message && <p role="alert">{message}</p>}
        <div className={styles.actions}>
          {onRetry && <PillButton secondary onClick={onRetry}>Retry</PillButton>}
          <Link className={styles.login} href="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
