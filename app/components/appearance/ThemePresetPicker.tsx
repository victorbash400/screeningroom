import type { ThemeProfile } from "../../lib/appearance";
import ThemePresetButton from "./ThemePresetButton";
import styles from "./ThemePresetPicker.module.css";

export default function ThemePresetPicker({
  profiles,
  value,
  onChange,
}: {
  profiles: ThemeProfile[];
  value: string;
  onChange: (profile: ThemeProfile) => void;
}) {
  return (
    <fieldset className={styles.picker}>
      <legend>Theme</legend>
      <div className={styles.grid}>
        {profiles.map((profile) => (
          <ThemePresetButton
            key={profile.id}
            profile={profile}
            selected={profile.id === value}
            onSelect={onChange}
          />
        ))}
      </div>
    </fieldset>
  );
}
