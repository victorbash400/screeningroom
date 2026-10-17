import { Play, FileImage } from "lucide-react";
import { mediaTime, type MediaAnalysis } from "../../lib/mediaAnalysis";
import { useAudienceMap } from "../locations/AudienceMapContext";
import ResearchWidgetFrame from "./ResearchWidgetFrame";
import styles from "./MediaAnalysisCard.module.css";

export default function MediaAnalysisCard({ analysis, onOpen }: { analysis: MediaAnalysis; onOpen?: (id: string) => void }) {
  const chat = useAudienceMap();
  const label = analysis.modality === "audio" ? "Transcript" : analysis.modality === "video" ? "Video frames" : "Image";
  const range = analysis.start !== undefined && analysis.end !== undefined ? `${mediaTime(analysis.start)}–${mediaTime(analysis.end)}` : "";
  const basis = analysis.modality === "video" ? `${analysis.segments.length} sampled frames${range ? ` · ${range}` : ""}. Times are approximate frame positions. Unsampled scenes were not inspected.${analysis.hasAudio === false ? " This file has no audio track." : " Audio is analyzed separately."}` : analysis.modality === "audio" ? `Speech transcript${range ? ` · ${range}` : ""}. Timestamps identify audio chunks, not individual words.${analysis.nextStart !== undefined ? " More audio remains." : ""}` : "Visual description and legible text from a resized image.";
  return <ResearchWidgetFrame title={`${label} · ${analysis.name}`} source={analysis.model} basis={basis}>
    <div className={styles.actions}>
      {onOpen && <button type="button" onClick={() => onOpen(analysis.fileId)}>{analysis.modality === "image" ? <FileImage size={14} /> : <Play size={14} />}Open media</button>}
      {range && <span>{range}{analysis.duration !== undefined ? ` / ${mediaTime(analysis.duration)}` : ""}</span>}
    </div>
    {analysis.summary && <p className={styles.summary}>{analysis.summary}</p>}
    {analysis.visibleText && <details className={styles.disclosure}><summary>Visible text</summary><div className={styles.scroll}>{analysis.visibleText}</div></details>}
    {analysis.segments.length > 0 && <details className={styles.disclosure} open={analysis.modality === "audio"}><summary>{analysis.modality === "audio" ? "Transcript" : `Frames (${analysis.segments.length})`}</summary>
      <div className={styles.scroll}>{analysis.segments.map((segment, index) => <div className={styles.segment} key={index}><span>{mediaTime(segment.start)}</span><p>{segment.text || "No speech detected."}</p></div>)}</div>
    </details>}
    {analysis.uncertainties.length > 0 && <details className={styles.disclosure}><summary>Uncertainty</summary><div className={styles.scroll}>{analysis.uncertainties.map((item, index) => <p key={index}>{item}</p>)}</div></details>}
    {analysis.nextStart !== undefined && <button type="button" className={styles.continue} disabled={chat?.busy} onClick={() => chat?.ask(`Continue transcribing the selected file ${analysis.name} (file ID ${analysis.fileId}) from ${analysis.nextStart} seconds.`)}>Continue transcript</button>}
  </ResearchWidgetFrame>;
}
