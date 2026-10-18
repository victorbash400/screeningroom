import type { MediaTranscript as Transcript } from "../../lib/mediaAnalysis";
import { mediaTime } from "../../lib/mediaAnalysis";
import styles from "./MediaTranscript.module.css";
import ResearchDisclosure from "./ResearchDisclosure";

export default function MediaTranscript({ transcript }: { transcript: Transcript }) {
  return <ResearchDisclosure title="Transcript" metadata={`${mediaTime(transcript.start)}–${mediaTime(transcript.end)}`}>
    <div className={styles.scroll}>{transcript.segments.map((segment, index) => <div className={styles.segment} key={index}><span>{mediaTime(segment.start)}</span><p>{segment.silence ? "Silence" : segment.text || "No speech detected."}</p></div>)}</div>
    {transcript.uncertainties.length > 0 && <ResearchDisclosure title="Speech uncertainty"><div className={styles.uncertainty}>{transcript.uncertainties.map((text, index) => <p key={index}>{text}</p>)}</div></ResearchDisclosure>}
  </ResearchDisclosure>;
}
