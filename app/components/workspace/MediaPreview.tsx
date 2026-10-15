import { useEffect, useRef, useState } from "react";
import MediaControls from "./MediaControls";
import styles from "./MediaPreview.module.css";
export default function MediaPreview({
  source,
  video,
  onAspectRatio,
}: {
  source: string;
  video: boolean;
  onAspectRatio?: (ratio: number) => void;
}) {
  const media = useRef<HTMLMediaElement>(null);
  const [playing, setPlaying] = useState(false),
    [current, setCurrent] = useState(0),
    [duration, setDuration] = useState(0),
    [muted, setMuted] = useState(false),
    [error, setError] = useState<string | null>(null);
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
    if (media.current?.error) setError("Cannot play this file.");
  }, []);
  const events = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: () => setCurrent(media.current?.currentTime ?? 0),
    onSeeking: () => setCurrent(media.current?.currentTime ?? 0),
    onLoadedMetadata: updateDuration,
    onDurationChange: updateDuration,
    onVolumeChange: () => setMuted(media.current?.muted ?? false),
    onError: () => setError("Cannot play this file."),
  };
  return (
    <div className={styles.media} data-playing={playing}>
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
      {error && <p role="alert">{error}</p>}
      <MediaControls
        media={media}
        video={video}
        playing={playing}
        current={current}
        duration={duration}
        muted={muted}
        onError={setError}
      />
    </div>
  );
}
