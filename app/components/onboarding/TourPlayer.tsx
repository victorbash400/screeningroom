import { Play } from "lucide-react";
import { useMemo } from "react";
import type { TourStep } from "../../lib/productTour";
import { tourScripts, tourSceneAt, tourCueAt, tourDraftAt, tourNameAt, tourImportItemsAt } from "./tourScript";
import { useTourPlayback } from "./useTourPlayback";
import TourViewport from "./TourViewport";
import TourStage from "./TourStage";
import TourTransport from "./TourTransport";
import TourNavigation from "./TourNavigation";
import styles from "./TourPlayer.module.css";

export default function TourPlayer({ step, index, count, onStep, onClose }: { step: TourStep; index: number; count: number; onStep: (index: number) => void; onClose: () => void }) {
  const script = tourScripts[step];
  const playback = useTourPlayback(script.duration);
  const committedAt = script.cues.findLast(cue => playback.time >= cue.commit)?.commit ?? 0;
  const draft = step === "question" ? tourDraftAt(playback.time) : undefined;
  const name = step === "workspace" ? tourNameAt(playback.time) : "";
  const imported = step === "workspace" ? tourImportItemsAt(playback.time) : 0;
  const scene = useMemo(() => {
    const result = tourSceneAt(step, committedAt);
    if (draft !== undefined && !result.sent) result.draft = draft;
    if (step === "workspace") { result.workspaceName = name; result.importItems = imported; }
    return result;
  }, [step, committedAt, draft, name, imported]);
  const cue = tourCueAt(step, playback.time);
  return <div className={styles.player} aria-label="Walkthrough player" onKeyDown={event => {
    if (event.target !== event.currentTarget || event.key !== " ") return;
    event.preventDefault(); playback.toggle();
  }} tabIndex={0}>
    <div className={styles.video}>
      <TourViewport><TourStage scene={scene} cue={cue} time={playback.time} first={cue === script.cues[0]} /></TourViewport>
      {playback.time === 0 && !playback.playing && <button type="button" className={styles.play} aria-label="Start example" onClick={playback.toggle}><Play size={24} fill="currentColor" /><span>Play example</span></button>}
    </div>
    <div className={styles.controls}>
      <div className={styles.action} aria-live="polite">{playback.time >= script.duration ? "Example complete" : cue.label}</div>
      <TourTransport time={playback.time} duration={script.duration} playing={playback.playing} onToggle={playback.toggle} onReplay={playback.replay} onSeek={playback.seek} index={index} count={count} onStep={onStep} onClose={onClose} />
      <TourNavigation index={index} onStep={onStep} />
    </div>
  </div>;
}
