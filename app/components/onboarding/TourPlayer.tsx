import { Play } from "lucide-react";
import { useMemo } from "react";
import type { TourStep } from "../../lib/productTour";
import { tourScripts, tourSceneAt, tourCueAt } from "./tourScript";
import { useTourPlayback } from "./useTourPlayback";
import TourViewport from "./TourViewport";
import TourStage from "./TourStage";
import TourTransport from "./TourTransport";
import styles from "./TourPlayer.module.css";

export default function TourPlayer({ step }: { step: TourStep }) {
  const script = tourScripts[step];
  const playback = useTourPlayback(script.duration);
  const frame = Math.floor(playback.time / 40) * 40;
  const scene = useMemo(() => tourSceneAt(step, frame), [step, frame]);
  const cue = tourCueAt(step, playback.time);
  return <div className={styles.player} aria-label="Walkthrough player" onKeyDown={event => {
    if (event.target !== event.currentTarget || event.key !== " ") return;
    event.preventDefault(); playback.toggle();
  }} tabIndex={0}>
    <div className={styles.video}>
      <TourViewport><TourStage scene={scene} cue={cue} time={playback.time} first={cue === script.cues[0]} playing={playback.playing} /></TourViewport>
      {playback.time === 0 && !playback.playing && <button type="button" className={styles.play} aria-label="Start example" onClick={playback.toggle}><Play size={24} fill="currentColor" /><span>Play example</span></button>}
    </div>
    <div className={styles.controls}>
      <div className={styles.caption}><span className={styles.sample}>Sample data</span><div className={styles.action} aria-live="polite">{playback.time >= script.duration ? "Example complete" : cue.label}</div></div>
      <TourTransport time={playback.time} duration={script.duration} playing={playback.playing} onToggle={playback.toggle} onReplay={playback.replay} onSeek={playback.seek} />
    </div>
  </div>;
}
