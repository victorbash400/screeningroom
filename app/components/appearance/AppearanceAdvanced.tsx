import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useAppearance } from "../../state/AppearanceContext";
import { darkProfiles, lightProfiles } from "../../lib/appearance";
import SettingsGroup from "../settings/SettingsGroup";
import SettingsRow from "../settings/SettingsRow";
import styles from "./AppearanceAdvanced.module.css";
export default function AppearanceAdvanced() {
  const { value, dark, update } = useAppearance();
  const [expanded, setExpanded] = useState(false);
  const key = dark ? "dark" : "light";
  const profile = value[key];
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <div>
      <div className={styles.actions}>
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          Advanced
          <ChevronRight size={14} className={expanded ? styles.expanded : ""} />
        </button>
        <button
          onClick={() =>
            update({
              ...value,
              [key]: (dark ? darkProfiles : lightProfiles)[0],
            })
          }
        >
          Reset to default
        </button>
      </div>
      {expanded && (
        <SettingsGroup>
          <SettingsRow label="Contrast">
            <div className={styles.contrast}>
              <input
                type="range"
                aria-label="Contrast"
                min={0}
                max={100}
                step={1}
                value={editing ?? profile.contrast}
                onChange={(event) => setEditing(Number(event.target.value))}
                onPointerUp={() => {
                  if (editing !== null) {
                    update({
                      ...value,
                      [key]: { ...profile, contrast: editing },
                    });
                    setEditing(null);
                  }
                }}
                onKeyUp={() => {
                  if (editing !== null) {
                    update({
                      ...value,
                      [key]: { ...profile, contrast: editing },
                    });
                    setEditing(null);
                  }
                }}
              />
              <output>{editing ?? profile.contrast}</output>
            </div>
          </SettingsRow>
        </SettingsGroup>
      )}
    </div>
  );
}
