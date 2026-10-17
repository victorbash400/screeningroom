import { Pause, Play } from "lucide-react";
import type { CSSProperties } from "react";
import IconButton from "../controls/IconButton";
import styles from "./AudioControls.module.css";
import VolumeControl from "./VolumeControl";

function clock(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function AudioControls({
  playing,
  buffering,
  muted,
  volume,
  onVolume,
  current,
  duration,
  onPlay,
  onMute,
  onSeek,
}: {
  playing: boolean;
  buffering: boolean;
  muted: boolean;
  volume: number;
  onVolume: (volume: number) => void;
  current: number;
  duration: number;
  onPlay: () => void;
  onMute: () => void;
  onSeek: (time: number) => void;
}) {
  return (
    <div className={styles.controls} data-buffering={buffering}>
      <div className={styles.transport}>
        <IconButton
          className={styles.play}
          label={playing ? "Pause" : "Play"}
          disabled={buffering}
          onClick={onPlay}
        >
          {playing ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </IconButton>
      </div>
      <div className={styles.timeline}>
        <span>{clock(current)}</span>
        <input
          type="range"
          aria-label="Playback position"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(current, duration || 1)}
          disabled={!duration}
          style={{ "--progress": `${duration ? (current / duration) * 100 : 0}%` } as CSSProperties}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <span>−{clock(duration - current)}</span>
        <VolumeControl volume={volume} muted={muted} onMute={onMute} onVolume={onVolume} />
      </div>
    </div>
  );
}
