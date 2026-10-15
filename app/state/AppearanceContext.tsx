"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import {
  appearanceVariables,
  defaultAppearance,
  parseAppearance,
} from "../lib/appearance";
import type { Appearance } from "../lib/appearance";
import { useAccount } from "./AccountContext";
const AppearanceContext = createContext<{
  value: Appearance;
  dark: boolean;
  error: string | null;
  update: (value: Appearance) => void;
} | null>(null);
const subscribe = (changed: () => void) => {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
};
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const key = `screeningroom.appearance.${account.user?.id ?? "local"}`;
  const [value, setValue] = useState(defaultAppearance);
  const [error, setError] = useState<string | null>(null);
  const systemDark = useSyncExternalStore(
    subscribe,
    () => matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  const dark = value.mode === "system" ? systemDark : value.mode === "dark";
  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(key);
        setValue(raw === null ? defaultAppearance : parseAppearance(raw));
        setError(null);
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Cannot load appearance.",
        );
      }
    }
    load();
    const sync = (event: StorageEvent) => {
      if (event.key === key) load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
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
  function update(next: Appearance) {
    try {
      const raw = JSON.stringify(next);
      parseAppearance(raw);
      localStorage.setItem(key, raw);
      setValue(next);
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Cannot save appearance.",
      );
    }
  }
  return (
    <AppearanceContext value={{ value, dark, error, update }}>
      {children}
    </AppearanceContext>
  );
}
export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error("Appearance provider is missing.");
  return appearance;
}
