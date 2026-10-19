import styles from "./AudienceModeToggle.module.css";

export default function AudienceModeToggle({ value, disabled, onChange }: {
  value: "live" | "digital";
  disabled?: boolean;
  onChange: (mode: "live" | "digital") => boolean;
}) {
  return <div className={styles.toggle} role="group" aria-label="Audience format">
    {(["live", "digital"] as const).map((mode) => <button key={mode} type="button" aria-pressed={value === mode}
      disabled={disabled} onClick={() => onChange(mode)}>{mode === "live" ? "Live" : "Digital"}</button>)}
  </div>;
}
