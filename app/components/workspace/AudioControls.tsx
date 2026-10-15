import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { CSSProperties } from "react";
import IconButton from "../controls/IconButton";
import styles from "./AudioControls.module.css";

function clock(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function AudioControls({
  playing,
  muted,
  current,
  duration,
  onPlay,
  onMute,
  onSeek,
}: {
  playing: boolean;
  muted: boolean;
  current: number;
  duration: number;
  onPlay: () => void;
  onMute: () => void;
  onSeek: (time: number) => void;
}) {
  return (
    <div className={styles.controls}>
      <div className={styles.transport}>
        <IconButton
          className={styles.play}
          label={playing ? "Pause" : "Play"}
          onClick={onPlay}
        >
          {playing ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </IconButton>
        <IconButton
          className={styles.volume}
          label={muted ? "Unmute" : "Mute"}
          onClick={onMute}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </IconButton>
      </div>
      <input
        type="range"
        aria-label="Playback position"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(current, duration || 1)}
        disabled={!duration}
        style={
          {
            "--progress": `${duration ? (current / duration) * 100 : 0}%`,
          } as CSSProperties
        }
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <div className={styles.time}>
        <span>{clock(current)}</span>
        <span>{clock(duration)}</span>
      </div>
    </div>
  );
}
