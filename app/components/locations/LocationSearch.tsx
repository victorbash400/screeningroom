import { useEffect, useRef, useState, type RefObject } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { useAccount } from "../../state/AccountContext";
import type { LocationInterest } from "../../lib/locationInterest";
import styles from "./LocationSearch.module.css";

interface Place { name: string; detail: string; latitude: number; longitude: number }
export default function LocationSearch({ inputRef, onSelect }: { inputRef?: RefObject<HTMLInputElement | null>; onSelect: (place: Pick<LocationInterest, "name" | "latitude" | "longitude">) => void }) {
  const account = useAccount();
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function search() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setError(""); setPlaces([]);
    try {
      const response = await account.fetch(`/api/locations/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Place search failed.");
      setPlaces(value.places);
      if (!value.places.length) setError("No places found. Try another name.");
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Place search failed.");
    } finally { if (active.current === controller) setBusy(false); }
  }
  return <div className={styles.search}>
    <form onSubmit={(event) => { event.preventDefault(); if (query.trim()) void search(); }}>
      <button type="submit" aria-label="Search places" disabled={busy || !query.trim()}>{busy ? <LoaderCircle className={styles.busy} /> : <Search size={18} strokeWidth={1.8} />}</button>
      <input ref={inputRef} aria-label="Search places" placeholder="Search places" value={query} onChange={(event) => { active.current?.abort(); setBusy(false); setQuery(event.target.value); setPlaces([]); setError(""); }} />
    </form>
    {(places.length > 0 || error) && <div className={styles.results}>
      {places.map((place, index) => <button type="button" key={`${place.longitude}:${place.latitude}:${index}`} onClick={() => {
        onSelect({ name: place.name, latitude: place.latitude, longitude: place.longitude }); setPlaces([]); setQuery(place.name);
      }}><span>{place.name}</span><small>{place.detail}</small></button>)}
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>;
}
