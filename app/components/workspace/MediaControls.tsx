import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { RefObject } from "react";
import IconButton from "../controls/IconButton";
import styles from "./MediaControls.module.css";
import AudioControls from "./AudioControls";
function clock(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export default function MediaControls({
  media,
  playing,
  current,
  duration,
  muted,
  video,
  onError,
}: {
  media: RefObject<HTMLMediaElement | null>;
  playing: boolean;
  current: number;
  duration: number;
  muted: boolean;
  video: boolean;
  onError: (error: string) => void;
}) {
  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    if (!video) return;
    const changed = () =>
      setFullScreen(
        media.current?.parentElement?.matches(":fullscreen") ?? false,
      );
    changed();
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, [media, video]);
  async function togglePlayback() {
    try {
      if (playing) media.current?.pause();
      else await media.current?.play();
    } catch {
      onError("Cannot play this file.");
    }
  }
  function toggleMute() {
    if (media.current) media.current.muted = !muted;
  }
  if (!video)
    return (
      <AudioControls
        playing={playing}
        muted={muted}
        current={current}
        duration={duration}
        onPlay={togglePlayback}
        onMute={toggleMute}
        onSeek={(time) => {
          if (media.current) media.current.currentTime = time;
        }}
      />
    );
  return (
    <div className={styles.controls}>
      <IconButton label={playing ? "Pause" : "Play"} onClick={togglePlayback}>
        {playing ? <Pause /> : <Play />}
      </IconButton>
      <span>{clock(current)}</span>
      <input
        aria-label="Playback position"
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(current, duration || 1)}
        disabled={!duration}
        onChange={(event) => {
          if (media.current)
            media.current.currentTime = Number(event.target.value);
        }}
      />
      <span>{clock(duration)}</span>
      <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
        {muted ? <VolumeX /> : <Volume2 />}
      </IconButton>
      {video && (
        <IconButton
          label={fullScreen ? "Exit full screen" : "Full screen"}
          onClick={async () => {
            try {
              if (fullScreen) await document.exitFullscreen();
              else await media.current?.parentElement?.requestFullscreen();
            } catch {
              onError("Cannot change full screen.");
            }
          }}
        >
          {fullScreen ? <Minimize /> : <Maximize />}
        </IconButton>
      )}
    </div>
  );
}
