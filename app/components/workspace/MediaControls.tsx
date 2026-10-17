import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import VideoControls from "./VideoControls";
import AudioControls from "./AudioControls";
export default function MediaControls({
  media,
  playing,
  buffering,
  current,
  duration,
  muted,
  volume,
  video,
  onError,
}: {
  media: RefObject<HTMLMediaElement | null>;
  playing: boolean;
  buffering: boolean;
  current: number;
  duration: number;
  muted: boolean;
  volume: number;
  video: boolean;
  onError: (error: string) => void;
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const lastVolume = useRef(1);
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
    if (!media.current) return;
    if (muted || volume === 0) {
      media.current.muted = false;
      if (media.current.volume === 0) media.current.volume = lastVolume.current;
    } else media.current.muted = true;
  }
  function changeVolume(value: number) {
    if (!media.current) return;
    if (value > 0) lastVolume.current = value;
    media.current.volume = value;
    media.current.muted = false;
  }
  if (!video)
    return (
      <AudioControls
        buffering={buffering}
        playing={playing}
        muted={muted}
        volume={volume}
        onVolume={changeVolume}
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
    <VideoControls
      buffering={buffering}
      playing={playing}
      muted={muted}
      volume={volume}
      onVolume={changeVolume}
      current={current}
      duration={duration}
      fullScreen={fullScreen}
      onPlay={togglePlayback}
      onMute={toggleMute}
      onSeek={(time) => {
        if (media.current) media.current.currentTime = time;
      }}
      onFullScreen={async () => {
        try {
          if (fullScreen) await document.exitFullscreen();
          else await media.current?.parentElement?.requestFullscreen();
        } catch {
          onError("Cannot change full screen.");
        }
      }}
    />
  );
}
