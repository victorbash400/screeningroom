import { Play, FileImage } from "lucide-react";
import { mediaTime, type MediaAnalysis } from "../../lib/mediaAnalysis";
import { useAudienceMap } from "../locations/AudienceMapContext";
import MediaTranscript from "./MediaTranscript";
import ResearchWidgetFrame from "./ResearchWidgetFrame";
import ResearchDisclosure from "./ResearchDisclosure";
import styles from "./MediaAnalysisCard.module.css";

export default function MediaAnalysisCard({ analysis, onOpen }: { analysis: MediaAnalysis; onOpen?: (id: string) => void }) {
  const chat = useAudienceMap();
  const label = analysis.modality === "audio" ? "Transcript" : analysis.modality === "video" ? "Video analysis" : "Image";
  const range = analysis.start !== undefined && analysis.end !== undefined ? `${mediaTime(analysis.start)}–${mediaTime(analysis.end)}` : "";
  const basis = analysis.modality === "video" ? `${analysis.segments.length} sampled frames${range ? ` · ${range}` : ""}. Times are approximate frame positions. Unsampled scenes were not inspected.${analysis.hasAudio === false ? " This file has no audio track." : analysis.transcript ? ` Speech transcribed across ${mediaTime(analysis.transcript.start)}–${mediaTime(analysis.transcript.end)}${analysis.transcript.complete ? ", covering the full audio track" : ""}.` : " Audio was not transcribed."}` : analysis.modality === "audio" ? `Speech transcript${range ? ` · ${range}` : ""}. Timestamps identify audio chunks, not individual words.${analysis.nextStart !== undefined ? " More audio remains." : ""}` : "Visual description and legible text from a resized image.";
  return <ResearchWidgetFrame title={`${label} · ${analysis.name}`} source={analysis.transcript ? `${analysis.model} · ${analysis.transcript.model}` : analysis.model} sourceInDetails basis={basis}>
    <div className={styles.actions}>
      {analysis.sourceUrl ? <a className={styles.sourceLink} href={analysis.sourceUrl} target="_blank" rel="noreferrer"><Play size={14} />Open video</a> : onOpen && <button type="button" onClick={() => onOpen(analysis.fileId)}>{analysis.modality === "image" ? <FileImage size={14} /> : <Play size={14} />}Open media</button>}
      {range && <span>{range}{analysis.duration !== undefined ? ` / ${mediaTime(analysis.duration)}` : ""}</span>}
    </div>
    {analysis.summary && <p className={styles.summary}>{analysis.summary}</p>}
    {analysis.visibleText && <ResearchDisclosure title="Visible text"><div className={styles.scroll}>{analysis.visibleText}</div></ResearchDisclosure>}
    {analysis.segments.length > 0 && <ResearchDisclosure title={analysis.modality === "audio" ? "Transcript" : "Frames"} metadata={analysis.modality === "audio" ? range : String(analysis.segments.length)} open={analysis.modality === "audio"}>
      <div className={styles.scroll}>{analysis.segments.map((segment, index) => <div className={styles.segment} key={index}><span>{mediaTime(segment.start)}</span><p>{segment.silence ? "Silence" : segment.text || "No speech detected."}</p></div>)}</div>
    </ResearchDisclosure>}
    {analysis.transcript && <MediaTranscript transcript={analysis.transcript} />}
    {analysis.uncertainties.length > 0 && <ResearchDisclosure title="Uncertainty"><div className={styles.scroll}>{analysis.uncertainties.map((item, index) => <p key={index}>{item}</p>)}</div></ResearchDisclosure>}
    {analysis.nextStart !== undefined && <button type="button" className={styles.continue} disabled={chat?.busy} onClick={() => chat?.ask(`Continue transcribing the selected file ${analysis.name} (file ID ${analysis.fileId}) from ${analysis.nextStart} seconds.`)}>Continue transcript</button>}
  </ResearchWidgetFrame>;
}
