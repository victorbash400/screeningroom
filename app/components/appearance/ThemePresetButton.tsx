import { Check } from "lucide-react";
import type { ThemeProfile } from "../../lib/appearance";
import ThemeModePreview from "./ThemeModePreview";
import styles from "./ThemePresetButton.module.css";

export default function ThemePresetButton({
  profile,
  selected,
  onSelect,
}: {
  profile: ThemeProfile;
  selected: boolean;
  onSelect: (profile: ThemeProfile) => void;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={selected}
      onClick={() => onSelect(profile)}
    >
      <span className={styles.preview}>
        <ThemeModePreview mode="light" light={profile} dark={profile} />
      </span>
      <span className={styles.label}>
        {profile.name}
        {selected && <Check size={12} aria-hidden="true" />}
      </span>
    </button>
  );
}
