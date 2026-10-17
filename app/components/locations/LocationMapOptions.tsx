import { Landmark, LocateFixed, Minus, Plus } from "lucide-react";
import IconButton from "../controls/IconButton";
import glass from "../workspace/PreviewGlass.module.css";
import styles from "./LocationMapOptions.module.css";
import LocationAreaControl from "./LocationAreaControl";
import type { LocationInterest } from "../../lib/locationInterest";

export default function LocationMapOptions({ area, onArea, landmarks, threeD, onLandmarks, onThreeD, onZoomIn, onZoomOut, onCenter }: {
  area?: LocationInterest; onArea: (area?: LocationInterest) => void;
  landmarks: boolean; threeD: boolean; onLandmarks: (enabled: boolean) => void; onThreeD: (enabled: boolean) => void;
  onZoomIn: () => void; onZoomOut: () => void; onCenter: () => void;
}) {
  return <div className={`${styles.options} ${glass.surface}`} role="group" aria-label="Map controls">
    {area && <LocationAreaControl area={area} onChange={onArea} />}
    <div className={styles.actions}>
    <div className={styles.group}>
    <IconButton label="Landmarks" title="Landmarks" selected={landmarks} onClick={() => onLandmarks(!landmarks)}><Landmark /></IconButton>
    <IconButton label="3D map" title={threeD ? "Switch to 2D" : "Switch to 3D"} selected={threeD} onClick={() => onThreeD(!threeD)}><span>{threeD ? "2D" : "3D"}</span></IconButton>
    </div>
    <div className={styles.group}>
      <IconButton label="Zoom out" title="Zoom out" onClick={onZoomOut}><Minus /></IconButton>
      <IconButton label="Zoom in" title="Zoom in" onClick={onZoomIn}><Plus /></IconButton>
    </div>
    <IconButton label="Set area at map center" title="Set area at map center" onClick={onCenter}><LocateFixed /></IconButton>
    </div>
  </div>;
}
