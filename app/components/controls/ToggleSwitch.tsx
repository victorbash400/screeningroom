import styles from "./ToggleSwitch.module.css";

export default function ToggleSwitch({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked}
    title={label} className={styles.switch} onClick={() => onChange(!checked)}>
    <span />
  </button>;
}
