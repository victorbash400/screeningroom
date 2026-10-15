import { useSyncExternalStore } from "react";
const query = "(max-width: 760px)";
function subscribe(changed: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}
function snapshot() {
  return window.matchMedia(query).matches;
}
export function useNarrowLayout() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
