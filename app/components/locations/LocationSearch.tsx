import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { useAccount } from "../../state/AccountContext";
import type { LocationInterest } from "../../lib/locationInterest";
import styles from "./LocationSearch.module.css";
import glass from "../workspace/PreviewGlass.module.css";

interface Place { name: string; detail: string; latitude: number; longitude: number }
export default function LocationSearch({ onSelect }: { onSelect: (place: Omit<LocationInterest, "radius">) => void }) {
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
    <form className={glass.surface} onSubmit={(event) => { event.preventDefault(); if (query.trim()) void search(); }}>
      <input aria-label="Search places" placeholder="Search places" value={query} onChange={(event) => { active.current?.abort(); setBusy(false); setQuery(event.target.value); setPlaces([]); setError(""); }} />
      <button type="submit" aria-label="Search" disabled={busy || !query.trim()}>{busy ? <LoaderCircle className={styles.busy} /> : <Search />}</button>
    </form>
    {(places.length > 0 || error) && <div className={`${styles.results} ${glass.surface}`}>
      {places.map((place, index) => <button type="button" key={`${place.longitude}:${place.latitude}:${index}`} onClick={() => {
        onSelect({ name: place.name, latitude: place.latitude, longitude: place.longitude }); setPlaces([]); setQuery(place.name);
      }}><span>{place.name}</span><small>{place.detail}</small></button>)}
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>;
}
