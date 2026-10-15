import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CSSProperties } from "react";
import styles from "./VideoControls.module.css";

function clock(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function VideoControls({
  playing,
  muted,
  current,
  duration,
  fullScreen,
  onPlay,
  onMute,
  onSeek,
  onFullScreen,
}: {
  playing: boolean;
  muted: boolean;
  current: number;
  duration: number;
  fullScreen: boolean;
  onPlay: () => void;
  onMute: () => void;
  onSeek: (time: number) => void;
  onFullScreen: () => void;
}) {
  return (
    <div className={styles.controls} role="group" aria-label="Video controls">
      <div className={styles.transport}>
        <button
          type="button"
          aria-label="Back 10 seconds"
          disabled={!duration}
          onClick={() => onSeek(Math.max(0, current - 10))}
        >
          <RotateCcw />
          <span>10</span>
        </button>
        <button
          type="button"
          className={styles.play}
          aria-label={playing ? "Pause" : "Play"}
          onClick={onPlay}
        >
          {playing ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          aria-label="Forward 10 seconds"
          disabled={!duration}
          onClick={() => onSeek(Math.min(duration, current + 10))}
        >
          <RotateCw />
          <span>10</span>
        </button>
      </div>
      <div className={styles.timeline}>
        <span>{clock(current)}</span>
        <input
          aria-label="Playback position"
          aria-valuetext={`${clock(current)} of ${clock(duration)}`}
          type="range"
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
          onInput={(event) => onSeek(Number(event.currentTarget.value))}
        />
        <span>−{clock(duration - current)}</span>
        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={onMute}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
        <button
          type="button"
          aria-label={fullScreen ? "Exit full screen" : "Full screen"}
          onClick={onFullScreen}
        >
          {fullScreen ? <Minimize /> : <Maximize />}
        </button>
      </div>
    </div>
  );
}
