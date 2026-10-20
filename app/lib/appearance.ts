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
  profile("slate", "Slate", "#F4F6F8", "#29333F", "#476B95", 45),
  profile("lagoon", "Lagoon", "#F1F7F6", "#263E3B", "#267D73", 45),
  profile("rose", "Rose", "#FAF4F5", "#47363D", "#A34F70", 45),
  profile("glacier", "Glacier", "#F2F7FA", "#293C48", "#347B9B", 45),
  profile("graphite", "Graphite", "#F5F5F4", "#30302E", "#62625D", 45),
];
export const darkProfiles = [
  profile("absolutely", "Clay", "#2D2D2B", "#F9F9F7", "#CC7D5E", 50),
  profile("codex", "Clear", "#181818", "#FFFFFF", "#339CFF", 60),
  profile("dracula", "Orchid", "#282A36", "#F8F8F2", "#FF79C6", 60),
  profile("graphite", "Graphite", "#1C1D20", "#E4E4E7", "#B4B8C2", 50),
  profile("midnight", "Midnight", "#141A26", "#DEE5F0", "#91AEDE", 50),
  profile("slate", "Slate", "#222831", "#E0E5ED", "#99B3D1", 50),
  profile("lagoon", "Lagoon", "#182725", "#DCE9E5", "#84C4B5", 50),
  profile("everforest", "Fern", "#222921", "#E0E5D9", "#AEBD8E", 50),
  profile("gruvbox", "Sand", "#29251F", "#E9E1D3", "#D4B382", 50),
  profile("notion", "Paper", "#20201F", "#E7E5DF", "#BEB9AA", 50, "System"),
  profile("raycast", "Coral", "#281F20", "#EDE0DE", "#E9A095", 50, "Inter"),
  profile("catppuccin", "Lilac", "#242130", "#E6E0F0", "#B8A3D9", 50),
  profile("rose", "Rose", "#2A2128", "#EDE0E7", "#D5A0B7", 50),
  profile("glacier", "Glacier", "#1D2830", "#DFE9EE", "#94C3D5", 50),
  profile("ember", "Ember", "#25211F", "#E9E1DB", "#D9A17F", 50),
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
export function luminance(hex: string) {
  const linear = (offset: number) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5);
}
export function contrastRatio(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function appearanceVariables(profile: ThemeProfile) {
  const { surface, ink, accent, contrast, font } = profile;
  const color = (amount: number) => mix(surface, ink, amount);
  let mutedAmount = 0.56 + contrast * 0.001;
  const backgrounds = [surface, color(0.018), color(0.06), mix(surface, accent, 0.13 + contrast * 0.001)];
  while (
    mutedAmount < 1 &&
    backgrounds.some((background) => contrastRatio(color(mutedAmount), background) < 4.5)
  ) mutedAmount = Math.min(1, mutedAmount + 0.01);
  return {
    "--danger": (luminance(surface) + 0.05) ** 2 > 0.15 ? "#b73526" : "#ff8e77",
    "--surface": surface,
    "--ink": ink,
    "--accent": accent,
    "--on-accent": contrastRatio(accent, "#151515") >= 4.5
      ? "#151515"
      : contrastRatio(accent, "#ffffff") >= 4.5 ? "#ffffff" : "#000000",
    "--panel": color(0.018),
    "--muted": color(mutedAmount),
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
