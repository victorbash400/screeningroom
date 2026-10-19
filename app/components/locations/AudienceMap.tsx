import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LocationInterest } from "../../lib/locationInterest";
import type { MapPlace, MapScene } from "../../lib/mapScene";
import { mapPresentationSchema } from "../../lib/mapScene";
import { defaultLocationInterest } from "../../lib/locationInterest";
import { useAccount } from "../../state/AccountContext";
import MapSearchControls from "./MapSearchControls";
import LocationMapCanvas from "./LocationMapCanvas";
import styles from "./AudienceMap.module.css";
import VenueCarousel from "./VenueCarousel";

export default function AudienceMap({ mode, open, area = defaultLocationInterest, scene, onArea, onScene, compact = false, animate = true, searching: controlledSearching }: {
  searching?: boolean;
  compact?: boolean;
  animate?: boolean;
  onScene: (scene: MapScene) => boolean;
  mode: "live" | "digital";
  open: boolean;
  area?: LocationInterest;
  scene?: MapScene;
  onArea: (area?: LocationInterest) => boolean;
}) {
  const account = useAccount();
  const request = useRef<AbortController | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    request.current?.abort(); setSearching(false); setSearchError("");
    return () => request.current?.abort();
  }, [area.latitude, area.longitude, area.radius, area.venueTypes?.join(",")]);
  async function searchArea() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setSearching(true); setSearchError("");
    try {
      const response = await account.fetch("/api/locations/venues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(area), signal: controller.signal });
      const value = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(value.error || "Venue search failed.");
      if (!onScene({ id: crypto.randomUUID(), presentation: mapPresentationSchema.parse(value) })) throw new Error("Venue results could not be saved.");
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "Venue search failed.");
    } finally { if (request.current === controller) setSearching(false); }
  }
  function selectPlace(place: MapPlace) {
    const presentation = scene?.presentation ?? { locations: [] };
    const index = presentation.locations.findIndex((item) =>
      place.id && item.id ? item.id === place.id : item.longitude === place.longitude && item.latitude === place.latitude);
    const locations = index < 0 ? [...presentation.locations, place] : presentation.locations;
    if (!onScene({ id: crypto.randomUUID(), presentation: { ...presentation, locations, focusIndex: index < 0 ? locations.length - 1 : index, zoom: 17, threeD: true } })) {
      setSearchError("Venue selection could not be saved.");
    }
  }
  const [landmarks, setLandmarks] = useState(true);
  const [view, setView] = useState<{ sceneId?: string; threeD: boolean }>({ threeD: true });
  const threeD = view.sceneId === scene?.id ? view.threeD : scene?.presentation.threeD ?? true;
  return <section role="region" aria-label="Audience map" className={styles.window}
    style={{ "--venue-carousel-height": mode === "live" && scene?.presentation.locations.length ? compact ? "clamp(170px, 32cqh, 220px)" : "clamp(190px, 34cqh, 280px)" : "0px" } as CSSProperties}>
    <div className={styles.mapArea}>
    <MapSearchControls live={mode === "live"} area={area} onArea={onArea} searching={controlledSearching ?? searching} error={searchError} onSearchArea={mode === "live" ? () => void searchArea() : undefined} />
    <LocationMapCanvas
      animate={animate} onPlace={selectPlace} visible={open} scene={mode === "digital" && scene ? { ...scene, presentation: { ...scene.presentation, locations: [], focusIndex: undefined } } : scene} area={area} onArea={onArea} landmarks={landmarks} threeD={threeD}
      onLandmarks={setLandmarks} onThreeD={(value) => setView({ sceneId: scene?.id, threeD: value })} />
    </div>
    {mode === "live" && <VenueCarousel compact={compact} animate={animate} scene={scene} onScene={onScene} />}
  </section>;
}
