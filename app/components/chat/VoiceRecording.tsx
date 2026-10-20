import { LoaderCircle, Square, X } from "lucide-react";
import IconButton from "../controls/IconButton";
import VoiceWaveform from "./VoiceWaveform";
import styles from "./VoiceRecording.module.css";

export default function VoiceRecording({ phase, analyser, onStop, onCancel }: { phase: "requesting" | "recording" | "transcribing"; analyser?: AnalyserNode; onStop: () => void; onCancel: () => void }) {
  return <div className={styles.recording} role="group" aria-label={phase === "recording" ? "Recording message" : phase === "transcribing" ? "Transcribing message" : "Requesting microphone"}>
    <IconButton label="Cancel dictation" onClick={onCancel}><X size={17} /></IconButton>
    <VoiceWaveform analyser={analyser} />
    {phase === "recording" ? <IconButton label="Stop recording" onClick={onStop}><Square size={16} fill="currentColor" /></IconButton> : <span className={styles.processing} role="status" aria-label={phase === "transcribing" ? "Transcribing" : "Connecting microphone"}><LoaderCircle size={17} /></span>}
  </div>;
}
