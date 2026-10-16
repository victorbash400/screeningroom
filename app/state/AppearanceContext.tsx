"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { appearanceVariables } from "../lib/appearance";
import type { Appearance } from "../lib/appearance";
import { useAccountAppearance } from "./useAccountAppearance";
const AppearanceContext = createContext<{
  value: Appearance;
  dark: boolean;
  error: string | null;
  update: (value: Appearance) => void;
  retry: () => void;
} | null>(null);
const subscribe = (changed: () => void) => {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
};
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { value, error, update, retry } = useAccountAppearance();
  const systemDark = useSyncExternalStore(
    subscribe,
    () => matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  const dark = value.mode === "system" ? systemDark : value.mode === "dark";
  useEffect(() => {
    const root = document.documentElement;
    const variables = appearanceVariables(dark ? value.dark : value.light);
    for (const [name, color] of Object.entries(variables))
      root.style.setProperty(name, color);
    root.style.colorScheme = dark ? "dark" : "light";
    return () => {
      for (const name of Object.keys(variables))
        root.style.removeProperty(name);
      root.style.removeProperty("color-scheme");
    };
  }, [value, dark]);
  return (
    <AppearanceContext value={{ value, dark, error, update, retry }}>
      {children}
    </AppearanceContext>
  );
}
export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error("Appearance provider is missing.");
  return appearance;
}
