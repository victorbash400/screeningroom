import { useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal, MoveDiagonal2 } from "lucide-react";
import type { LocationInterest } from "../../lib/locationInterest";
import type { MapScene } from "../../lib/mapScene";
import glass from "../workspace/PreviewGlass.module.css";
import LocationSearch from "./LocationSearch";
import LocationMapCanvas from "./LocationMapCanvas";
import LocationAreaControl from "./LocationAreaControl";
import { useMapFrame } from "./useMapFrame";
import styles from "./FloatingLocationMap.module.css";

export default function FloatingLocationMap({ anchor, open, area, scene, onArea }: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  area?: LocationInterest;
  scene?: MapScene;
  onArea: (area?: LocationInterest) => boolean;
}) {
  const { frame, start, adjust } = useMapFrame(anchor);
  const [landmarks, setLandmarks] = useState(true);
  const [view, setView] = useState<{ sceneId?: string; threeD: boolean }>({ threeD: false });
  const threeD = view.sceneId === scene?.id ? view.threeD : scene?.presentation.threeD ?? false;
  if (!frame) return null;
  return createPortal(<section role="region" aria-label="Place map" hidden={!open} data-area={Boolean(area)} className={styles.window}
    style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}>
    <header className={styles.header}>
      <button type="button" title="Move map" aria-label="Move map" className={`${styles.handle} ${glass.surface}`} onPointerDown={(event) => start(event, "move")}
        onKeyDown={(event) => { if (adjust(event.key, "move")) event.preventDefault(); }}><GripHorizontal /></button>
      <LocationSearch onSelect={(place) => onArea({ ...place, radius: area?.radius ?? 5_000 })} />
    </header>
    <LocationMapCanvas visible={open} scene={scene} area={area} onArea={onArea} landmarks={landmarks} threeD={threeD}
      onLandmarks={setLandmarks} onThreeD={(value) => setView({ sceneId: scene?.id, threeD: value })} />
    {area && <LocationAreaControl area={area} onChange={onArea} />}
    <button type="button" className={`${styles.resize} ${glass.surface}`} aria-label="Resize map" onPointerDown={(event) => start(event, "resize")}
      onKeyDown={(event) => { if (adjust(event.key, "resize")) event.preventDefault(); }}><MoveDiagonal2 /></button>
  </section>, document.body);
}
