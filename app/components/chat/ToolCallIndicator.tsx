import ToolCallDetails from "./ToolCallDetails";
import { ChevronRight, SquareTerminal } from "lucide-react";
import type { Message, MessageTool } from "../../lib/types";
import ToolElapsedTime from "./ToolElapsedTime";
import styles from "./ToolCallIndicator.module.css";

export default function ToolCallIndicator({ tool, status }: { tool: MessageTool; status?: Message["status"] }) {
  const state = tool.state === "running" && status !== "streaming" ? status === "stopped" ? "stopped" : "failed" : tool.state;
  const label = ({ readLinkedMedia: "Linked media", transcribeLinkedMedia: "Linked audio transcription", inspectLinkedVideo: "Linked video analysis", analyzeDigitalAudience: "Digital audience", establishAudienceWork: "Media context", getDigitalPlatformFit: "Digital platform affinity", inspectImage: "Image analysis", inspectVideo: "Video analysis", transcribeMedia: "Audio transcription", readSelectedMedia: "Selected media", getMediaEvidence: "Media evidence", compareMedia: "Media comparison", compareAudienceSignals: "Taste comparison", getAudienceInterestProfile: "Audience interests", analyzeProjectPerformance: "Project performance", renderEvidenceChart: "Evidence chart", searchEntities: "Qloo search", tasteInsights: "Qloo insights", findSimilar: "Qloo recommendations", findComparableMedia: "Comparable media", getLocalTaste: "Local audience tastes", searchMapPlaces: "Place search", searchAudienceVenues: "Audience venues", searchMapVenues: "Venue search", searchAudienceTags: "Audience interests", getAudienceDemographics: "Audience demographics", getAudienceHeatmap: "Audience heatmap", getAreaPopulation: "Population", loadPopulationResult: "Population result", setAudienceArea: "Search area", showMapLocations: "Map" } as Record<string, string>)[tool.name] ?? tool.name;
  return <details className={styles.disclosure}>
    <summary className={styles.tool} data-state={state} title={tool.error} aria-label={`${label}: ${state}${tool.error ? `. ${tool.error}` : ""}`}>
      <ChevronRight className={styles.chevron} aria-hidden="true" size={12} />
      <SquareTerminal aria-hidden="true" size={14} />
      <strong>{label}{state === "failed" ? " failed" : state === "stopped" ? " stopped" : ""}</strong>
      {tool.startedAt !== undefined && <ToolElapsedTime startedAt={tool.startedAt} endedAt={tool.endedAt} running={state === "running"} />}
    </summary>
    <ToolCallDetails tool={tool} label={label} />
  </details>;
}
