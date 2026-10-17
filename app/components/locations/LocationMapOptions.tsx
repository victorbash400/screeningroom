import { Landmark, LocateFixed, Minus, Plus, LoaderCircle } from "lucide-react";
import IconButton from "../controls/IconButton";
import type { LocationInterest } from "../../lib/locationInterest";
import MapHomeControl from "./MapHomeControl";
import styles from "./LocationMapOptions.module.css";

export default function LocationMapOptions({ landmarks, threeD, onLandmarks, onThreeD, onZoomIn, onZoomOut, area, onArea, onCurrentLocation, locating }: {
  landmarks: boolean; threeD: boolean; onLandmarks: (enabled: boolean) => void; onThreeD: (enabled: boolean) => void;
  onZoomIn: () => void; onZoomOut: () => void; onCurrentLocation: () => void; locating: boolean;
  area?: LocationInterest; onArea: (area?: LocationInterest) => void;
}) {
  return <div className={styles.options} role="group" aria-label="Map controls">
    <div className={styles.actions}>
      <div className={styles.group}>
        <IconButton label="Landmarks" title={landmarks ? "Hide landmarks" : "Show landmarks"} selected={landmarks} onClick={() => onLandmarks(!landmarks)}><Landmark /></IconButton>
        <IconButton label="3D map" title={threeD ? "Switch to 2D" : "Switch to 3D"} selected={threeD} onClick={() => onThreeD(!threeD)}><span>{threeD ? "2D" : "3D"}</span></IconButton>
      </div>
      <div className={styles.group}>
        <IconButton label="Zoom out" title="Zoom out" onClick={onZoomOut}><Minus /></IconButton>
        <IconButton label="Zoom in" title="Zoom in" onClick={onZoomIn}><Plus /></IconButton>
      </div>
      <div className={styles.group}>
        {area && <MapHomeControl area={area} onArea={onArea} />}
        <IconButton label="Use current location" title="Use current location" disabled={locating} onClick={onCurrentLocation}>{locating ? <LoaderCircle className={styles.busy} /> : <LocateFixed />}</IconButton>
      </div>
    </div>
  </div>;
}
