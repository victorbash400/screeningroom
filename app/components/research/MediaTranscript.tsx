import type { MediaTranscript as Transcript } from "../../lib/mediaAnalysis";
import { mediaTime } from "../../lib/mediaAnalysis";
import styles from "./MediaTranscript.module.css";

export default function MediaTranscript({ transcript }: { transcript: Transcript }) {
  return <details className={styles.transcript}>
    <summary>Transcript <span>{mediaTime(transcript.start)}–{mediaTime(transcript.end)}</span></summary>
    <div className={styles.scroll}>{transcript.segments.map((segment, index) => <div className={styles.segment} key={index}><span>{mediaTime(segment.start)}</span><p>{segment.silence ? "Silence" : segment.text || "No speech detected."}</p></div>)}</div>
    {transcript.uncertainties.length > 0 && <details className={styles.uncertainty}><summary>Speech uncertainty</summary>{transcript.uncertainties.map((text, index) => <p key={index}>{text}</p>)}</details>}
  </details>;
}
