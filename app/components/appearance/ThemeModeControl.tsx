import { useAppearance } from "../../state/AppearanceContext";
import ThemeModePreview from "./ThemeModePreview";
import styles from "./ThemeModeControl.module.css";
export default function ThemeModeControl() {
  const { value, update } = useAppearance();
  return (
    <div className={styles.modes} role="group" aria-label="Mode">
      {(["system", "light", "dark"] as const).map((mode) => (
        <button
          key={mode}
          aria-label={mode[0].toUpperCase() + mode.slice(1)}
          aria-pressed={value.mode === mode}
          onClick={() => update({ ...value, mode })}
        >
          <ThemeModePreview mode={mode} light={value.light} dark={value.dark} />
        </button>
      ))}
    </div>
  );
}
