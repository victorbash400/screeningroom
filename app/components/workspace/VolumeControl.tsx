import { Volume2, VolumeX } from "lucide-react";
import type { CSSProperties } from "react";
import styles from "./VolumeControl.module.css";

export default function VolumeControl({ volume, muted, onMute, onVolume }: {
  volume: number; muted: boolean; onMute: () => void; onVolume: (volume: number) => void;
}) {
  const silent = muted || volume === 0;
  return <div className={styles.control}>
    <button type="button" aria-label={silent ? "Unmute" : "Mute"} onClick={onMute}>
      {silent ? <VolumeX /> : <Volume2 />}
    </button>
    <input type="range" aria-label="Volume" aria-valuetext={`${Math.round((silent ? 0 : volume) * 100)}%`}
      min={0} max={1} step={0.01} value={silent ? 0 : volume}
      style={{ "--volume": `${(silent ? 0 : volume) * 100}%` } as CSSProperties}
      onChange={(event) => onVolume(Number(event.currentTarget.value))} />
  </div>;
}
