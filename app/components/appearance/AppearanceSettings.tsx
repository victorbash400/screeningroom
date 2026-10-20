import ErrorNotice from "../shell/ErrorNotice";
import { useAppearance } from "../../state/AppearanceContext";
import { darkProfiles, lightProfiles } from "../../lib/appearance";
import type { ThemeProfile } from "../../lib/appearance";
import SettingsGroup from "../settings/SettingsGroup";
import SettingsRow from "../settings/SettingsRow";
import SettingsPicker from "../settings/SettingsPicker";
import ThemeModeControl from "./ThemeModeControl";
import ThemeColorControl from "./ThemeColorControl";
import AppearanceAdvanced from "./AppearanceAdvanced";
import ThemePresetPicker from "./ThemePresetPicker";
import styles from "./AppearanceSettings.module.css";
export default function AppearanceSettings() {
  const { value, dark, update, error, retry } = useAppearance();
  const key = dark ? "dark" : "light";
  const profile = value[key];
  const presets = dark ? darkProfiles : lightProfiles;
  function change(next: ThemeProfile) {
    update({ ...value, [key]: next });
  }
  return (
    <div className={styles.settings}>
      {error && <ErrorNotice message={error} onRetry={retry} />}
      <SettingsGroup>
        <SettingsRow label="Mode">
          <ThemeModeControl />
        </SettingsRow>
      </SettingsGroup>
      <ThemePresetPicker profiles={presets} value={profile.id} onChange={change} />
      <SettingsGroup>
        {(
          [
            { key: "accent", label: "Accent" },
            { key: "surface", label: "Background" },
            { key: "ink", label: "Foreground" },
          ] as const
        ).map(({ key, label }) => (
          <SettingsRow key={key} label={label}>
            <ThemeColorControl
              key={`${dark}-${profile.id}-${profile[key]}`}
              label={label}
              color={profile[key]}
              onChange={(color) => change({ ...profile, [key]: color })}
            />
          </SettingsRow>
        ))}
        <SettingsRow label="Font">
          <SettingsPicker
            label="Font"
            width={112}
            value={profile.font}
            options={["System", "Geist", "Inter"].map((font) => ({
              value: font,
              label: font,
            }))}
            onChange={(font) =>
              change({ ...profile, font: font as ThemeProfile["font"] })
            }
          />
        </SettingsRow>
      </SettingsGroup>
      <AppearanceAdvanced />
    </div>
  );
}
