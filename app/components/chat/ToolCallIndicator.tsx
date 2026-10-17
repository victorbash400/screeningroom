import { SquareTerminal } from "lucide-react";
import type { Message, MessageTool } from "../../lib/types";
import ToolElapsedTime from "./ToolElapsedTime";
import styles from "./ToolCallIndicator.module.css";

export default function ToolCallIndicator({ tool, status }: { tool: MessageTool; status?: Message["status"] }) {
  const state = tool.state === "running" && status !== "streaming" ? status === "stopped" ? "stopped" : "failed" : tool.state;
  const label = ({ inspectImage: "Image analysis", inspectVideo: "Video frames", transcribeMedia: "Audio transcription", readSelectedMedia: "Selected media", getMediaEvidence: "Media evidence", compareMedia: "Media comparison", compareAudienceSignals: "Taste comparison", getAudienceInterestProfile: "Audience interests", analyzeProjectPerformance: "Project performance", renderEvidenceChart: "Evidence chart", searchEntities: "Qloo search", tasteInsights: "Qloo insights", findSimilar: "Qloo recommendations", searchMapPlaces: "Place search", searchAudienceVenues: "Audience venues", searchMapVenues: "Venue search", searchAudienceTags: "Audience interests", getAudienceDemographics: "Audience demographics", getAudienceHeatmap: "Audience heatmap", getAreaPopulation: "Population", loadPopulationResult: "Population result", setAudienceArea: "Search area", showMapLocations: "Map" } as Record<string, string>)[tool.name] ?? tool.name;
  return <span className={styles.tool} data-state={state} role="status" title={tool.error} aria-label={`${label}: ${state}${tool.error ? `. ${tool.error}` : ""}`}>
    <SquareTerminal aria-hidden="true" size={14} />
    <strong>{label}{state === "failed" ? " failed" : state === "stopped" ? " stopped" : ""}</strong>
    {tool.startedAt !== undefined && <ToolElapsedTime startedAt={tool.startedAt} endedAt={tool.endedAt} running={state === "running"} />}
  </span>;
}
