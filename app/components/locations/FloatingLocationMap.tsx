import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { MoveDiagonal2 } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import type { MapScene } from "../../lib/mapScene";
import { mapPresentationSchema } from "../../lib/mapScene";
import { defaultLocationInterest } from "../../lib/locationInterest";
import { useAccount } from "../../state/AccountContext";
import MapSearchControls from "./MapSearchControls";
import LocationMapCanvas from "./LocationMapCanvas";
import { useMapFrame } from "./useMapFrame";
import styles from "./FloatingLocationMap.module.css";

export default function FloatingLocationMap({ anchor, open, area = defaultLocationInterest, scene, onArea, onScene }: {
  onScene: (scene: MapScene) => boolean;
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  area?: LocationInterest;
  scene?: MapScene;
  onArea: (area?: LocationInterest) => boolean;
}) {
  const { frame, start, adjust } = useMapFrame(anchor);
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
  const [landmarks, setLandmarks] = useState(true);
  const [view, setView] = useState<{ sceneId?: string; threeD: boolean }>({ threeD: false });
  const threeD = view.sceneId === scene?.id ? view.threeD : scene?.presentation.threeD ?? false;
  if (!frame) return null;
  return createPortal(<section role="region" aria-label="Audience map" hidden={!open} className={styles.window}
    style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}>
    <MapSearchControls area={area} onArea={onArea} searching={searching} error={searchError} onSearchArea={() => void searchArea()}
      onMove={(event) => start(event, "move")} onMoveKey={(event) => { if (adjust(event.key, "move")) event.preventDefault(); }} />
    <LocationMapCanvas
      visible={open} scene={scene} area={area} onArea={onArea} landmarks={landmarks} threeD={threeD}
      onLandmarks={setLandmarks} onThreeD={(value) => setView({ sceneId: scene?.id, threeD: value })} />
    <button type="button" className={styles.resize} aria-label="Resize map" onPointerDown={(event) => start(event, "resize")}
      onKeyDown={(event) => { if (adjust(event.key, "resize")) event.preventDefault(); }}><MoveDiagonal2 /></button>
  </section>, document.body);
}
