import { useEffect, useRef, useState } from "react";
import type { LocationInterest } from "../../lib/locationInterest";
import { defaultLocationInterest } from "../../lib/locationInterest";

export function useCurrentLocation(area: LocationInterest | undefined, onArea: (area?: LocationInterest) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  function locate() {
    setError("");
    if (!navigator.geolocation) { setError("Current location is unavailable in this browser."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      if (!active.current) return;
      setBusy(false);
      onArea({ ...area ?? defaultLocationInterest, name: "Current location", latitude: position.coords.latitude, longitude: position.coords.longitude });
    }, (failure) => {
      if (!active.current) return;
      setBusy(false);
      setError(failure.code === 1 ? "Allow location access in your browser to use your current location."
        : failure.code === 3 ? "Location request timed out. Try again." : "Current location is unavailable. Try again.");
    }, { maximumAge: 60_000, timeout: 15_000 });
  }
  return { locate, busy, error };
}
