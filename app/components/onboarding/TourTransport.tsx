import { Pause, Play, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import video from "../workspace/VideoControls.module.css";
import styles from "./TourTransport.module.css";
function timestamp(milliseconds: number) { const seconds = Math.floor(milliseconds / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export default function TourTransport({ time, duration, playing, onToggle, onReplay, onSeek }: {
  time: number; duration: number; playing: boolean; onToggle: () => void; onReplay: () => void; onSeek: (time: number) => void;
}) {
  const Icon = playing ? Pause : Play;
  return <div className={styles.transport}>
    <div className={`${video.timeline} ${styles.pill}`}>
      <button type="button" aria-label={playing ? "Pause example" : time >= duration ? "Play example again" : "Play example"} onClick={onToggle}><Icon size={15} fill="currentColor" /></button>
      <button type="button" aria-label="Replay example" onClick={onReplay}><RotateCcw size={15} /></button>
      <span>{timestamp(time)}</span>
      <input type="range" aria-label="Example progress" aria-valuetext={`${timestamp(time)} of ${timestamp(duration)}`} min={0} max={duration} step={50} value={time} onChange={event => onSeek(Number(event.target.value))} style={{ "--progress": `${time / duration * 100}%` } as CSSProperties} />
      <span>{timestamp(duration)}</span>
    </div>
  </div>;
}
