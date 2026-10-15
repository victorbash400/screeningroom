export interface ThemeProfile {
  id: string;
  name: string;
  surface: string;
  ink: string;
  accent: string;
  contrast: number;
  font: "Geist" | "Inter" | "System";
}
export interface Appearance {
  version: 1;
  mode: "system" | "light" | "dark";
  light: ThemeProfile;
  dark: ThemeProfile;
}
const profile = (
  id: string,
  name: string,
  surface: string,
  ink: string,
  accent: string,
  contrast = 40,
  font: ThemeProfile["font"] = "Geist",
): ThemeProfile => ({ id, name, surface, ink, accent, contrast, font });
export const lightProfiles = [
  profile("absolutely", "Clay", "#F9F9F7", "#2D2D2B", "#CC7D5E"),
  profile("codex", "Clear", "#FFFFFF", "#0D0D0D", "#0285FF", 45),
  profile("catppuccin", "Lilac", "#EFF1F5", "#4C4F69", "#8839EF"),
  profile("gruvbox", "Sand", "#FBF1C7", "#3C3836", "#458588"),
  profile("everforest", "Fern", "#FDF6E3", "#5C6A72", "#93B259"),
  profile("notion", "Paper", "#FFFFFF", "#37352F", "#3183D8", 40, "System"),
  profile("raycast", "Coral", "#FFFFFF", "#030303", "#FF6363", 40, "Inter"),
];
export const darkProfiles = [
  profile("absolutely", "Clay", "#2D2D2B", "#F9F9F7", "#CC7D5E", 50),
  profile("codex", "Clear", "#181818", "#FFFFFF", "#339CFF", 60),
  profile("dracula", "Orchid", "#282A36", "#F8F8F2", "#FF79C6", 60),
];
export const defaultAppearance: Appearance = {
  version: 1,
  mode: "light",
  light: lightProfiles[0],
  dark: darkProfiles[0],
};
export function parseColor(value: string) {
  const text = value.trim();
  if (
    text.length !== 7 ||
    text[0] !== "#" ||
    !Array.from(text.slice(1)).every((digit) =>
      "0123456789abcdefABCDEF".includes(digit),
    )
  )
    throw new Error("Use a color in #RRGGBB format.");
  return text.toUpperCase();
}
export function mix(first: string, second: string, amount: number) {
  const channels = [1, 3, 5].map((offset) =>
    Math.round(
      parseInt(first.slice(offset, offset + 2), 16) * (1 - amount) +
        parseInt(second.slice(offset, offset + 2), 16) * amount,
    )
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}
export function appearanceVariables(profile: ThemeProfile) {
  const { surface, ink, accent, contrast, font } = profile;
  const color = (amount: number) => mix(surface, ink, amount);
  const linear = (hex: string, offset: number) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) =>
    0.2126 * linear(hex, 1) + 0.7152 * linear(hex, 3) + 0.0722 * linear(hex, 5);
  return {
    "--danger": (luminance(surface) + 0.05) ** 2 > 0.15 ? "#b73526" : "#ff8e77",
    "--surface": surface,
    "--ink": ink,
    "--accent": accent,
    "--on-accent": luminance(accent) > 0.179 ? "#151515" : "#ffffff",
    "--panel": color(0.018),
    "--muted": color(0.56 + contrast * 0.001),
    "--icon": color(0.78),
    "--selection": mix(surface, accent, 0.13 + contrast * 0.001),
    "--hover": color(0.06),
    "--stripe": color(0.025),
    "--border": color(0.1 + contrast * 0.001),
    "--sidebar-border": color(0.16),
    "--divider": color(0.08),
    "--disabled": color(0.28),
    "--ui-font":
      font === "System"
        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        : `${font}, sans-serif`,
  };
}
export function parseAppearance(raw: string): Appearance {
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("mode" in value) ||
    !["system", "light", "dark"].includes(String(value.mode))
  )
    throw new Error("Saved appearance is invalid.");
  function parse(value: unknown, presets: ThemeProfile[]) {
    if (!value || typeof value !== "object")
      throw new Error("Saved theme is invalid.");
    const data = value as Record<string, unknown>;
    const preset = presets.find((item) => item.id === data.id);
    if (
      !preset ||
      typeof data.surface !== "string" ||
      typeof data.ink !== "string" ||
      typeof data.accent !== "string" ||
      typeof data.contrast !== "number" ||
      !Number.isInteger(data.contrast) ||
      data.contrast < 0 ||
      data.contrast > 100 ||
      !["Geist", "Inter", "System"].includes(String(data.font))
    )
      throw new Error("Saved theme is invalid.");
    return {
      ...preset,
      surface: parseColor(data.surface),
      ink: parseColor(data.ink),
      accent: parseColor(data.accent),
      contrast: data.contrast,
      font: data.font as ThemeProfile["font"],
    };
  }
  return {
    version: 1,
    mode: value.mode as Appearance["mode"],
    light: parse("light" in value ? value.light : null, lightProfiles),
    dark: parse("dark" in value ? value.dark : null, darkProfiles),
  };
}
