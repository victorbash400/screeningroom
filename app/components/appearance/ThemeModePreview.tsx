import { mix } from "../../lib/appearance";
import type { Appearance, ThemeProfile } from "../../lib/appearance";
export default function ThemeModePreview({
  mode,
  light,
  dark,
}: {
  mode: Appearance["mode"];
  light: ThemeProfile;
  dark: ThemeProfile;
}) {
  const profile = mode === "dark" ? dark : light;
  const render = (profile: ThemeProfile) => (
    <>
      <rect width="60" height="36" fill={profile.surface} />
      <rect
        width="16"
        height="36"
        fill={mix(profile.surface, profile.ink, 0.07)}
      />
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x="22"
          y={13 + index * 6}
          width={index === 1 ? 24 : 30}
          height="2"
          rx="1"
          fill={mix(profile.surface, profile.ink, 0.2)}
        />
      ))}
      <rect x="22" y="7" width="32" height="2" rx="1" fill={profile.accent} />
      <circle cx="52" cy="29" r="2" fill={profile.accent} />
    </>
  );
  return (
    <svg width="60" height="36" viewBox="0 0 60 36" aria-hidden="true">
      {render(profile)}
      {mode === "system" && (
        <svg x="30" width="30" height="36" viewBox="30 0 30 36">
          {render(dark)}
        </svg>
      )}
    </svg>
  );
}
