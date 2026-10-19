import { useState } from "react";
import TourPreview from "./TourPreview";
import TourCursor from "./TourCursor";
import type { TourScene, TourCue } from "./tourScript";
import styles from "./TourStage.module.css";

export default function TourStage({ scene, cue, time, first = false, playing = false }: { scene: TourScene; cue: TourCue; time: number; first?: boolean; playing?: boolean }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return <div ref={setRoot} className={styles.stage} role="img" aria-label={cue.label}>
    <div className={styles.example} data-playing={playing} inert><TourPreview scene={scene} /></div>
    <TourCursor root={root} cue={cue} time={time} first={first} />
  </div>;
}
