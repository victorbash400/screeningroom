import { useEffect, useRef, useState } from "react";
import MediaControls from "./MediaControls";
import LoadingIndicator from "../controls/LoadingIndicator";
import styles from "./MediaPreview.module.css";
export default function MediaPreview({
  source,
  video,
  loading = false,
  onAspectRatio,
}: {
  source?: string;
  loading?: boolean;
  video: boolean;
  onAspectRatio?: (ratio: number) => void;
}) {
  const media = useRef<HTMLMediaElement>(null);
  const [playing, setPlaying] = useState(false),
    [current, setCurrent] = useState(0),
    [duration, setDuration] = useState(0),
    [muted, setMuted] = useState(false),
    [volume, setVolume] = useState(1),
    [error, setError] = useState<string | null>(null);
  const [readySource, setReadySource] = useState<string>();
  const buffering = !error && (loading || !source || readySource !== source);
  function updateDuration() {
    const next = media.current?.duration ?? 0;
    setDuration(Number.isFinite(next) ? next : 0);
    const element = media.current;
    if (
      element instanceof HTMLVideoElement &&
      element.videoWidth &&
      element.videoHeight
    )
      onAspectRatio?.(element.videoWidth / element.videoHeight);
  }
  useEffect(() => {
    updateDuration();
    setPlaying(false);
    setCurrent(0);
    setError(media.current?.error ? "Cannot play this file." : null);
  }, [source]);
  const events = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: () => setCurrent(media.current?.currentTime ?? 0),
    onLoadStart: () => setReadySource(undefined),
    onWaiting: () => setReadySource(undefined),
    onCanPlay: () => setReadySource(source),
    onPlaying: () => setReadySource(source),
    onSeeking: () => { setCurrent(media.current?.currentTime ?? 0); setReadySource(undefined); },
    onSeeked: () => { if ((media.current?.readyState ?? 0) >= 3) setReadySource(source); },
    onLoadedMetadata: updateDuration,
    onLoadedData: () => setReadySource(source),
    onDurationChange: updateDuration,
    onVolumeChange: () => { setMuted(media.current?.muted ?? false); setVolume(media.current?.volume ?? 1); },
    onError: () => setError("Cannot play this file."),
  };
  return (
    <div className={styles.media} data-playing={playing} data-buffering={buffering} aria-busy={buffering}>
      {video ? (
        <video
          ref={(element) => {
            media.current = element;
          }}
          src={source}
          playsInline
          preload="metadata"
          {...events}
        />
      ) : (
        <audio
          ref={(element) => {
            media.current = element;
          }}
          src={source}
          preload="metadata"
          {...events}
        />
      )}
      {buffering && <div className={video ? styles.buffering : styles.audioBuffering}><LoadingIndicator size={video ? 32 : 22} label={video ? "Loading video" : "Loading audio"} /></div>}
      {error && <p role="alert">{error}</p>}
      <MediaControls
        media={media}
        video={video}
        buffering={buffering}
        playing={playing}
        current={current}
        duration={duration}
        muted={muted}
        volume={volume}
        onError={setError}
      />
    </div>
  );
}
