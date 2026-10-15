import styles from "./AccountSubmitButton.module.css";

interface Props {
  label: string;
  ready: boolean;
  busy: boolean;
  light: boolean;
}

export default function AccountSubmitButton({ label, ready, busy, light }: Props) {
  return (
    <button
      className={`${styles.submit} ${light ? styles.light : ""}`}
      type="submit"
      disabled={!ready || busy}
      aria-busy={busy}
    >
      {busy ? "Please wait" : label}
    </button>
  );
}
