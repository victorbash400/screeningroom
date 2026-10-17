import { SquareTerminal } from "lucide-react";
import type { Message, MessageTool } from "../../lib/types";
import styles from "./ToolCallIndicator.module.css";

export default function ToolCallIndicator({ tool, status }: { tool: MessageTool; status?: Message["status"] }) {
  const state = tool.state === "running" && status !== "streaming" ? status === "stopped" ? "stopped" : "failed" : tool.state;
  const label = ({ searchEntities: "Qloo search", tasteInsights: "Qloo insights", findSimilar: "Qloo recommendations", searchMapPlaces: "Place search", searchAudienceVenues: "Venue search", showMapLocations: "Map" } as Record<string, string>)[tool.name] ?? tool.name;
  return <span className={styles.tool} data-state={state} role="status" title={tool.error} aria-label={`${label}: ${state}${tool.error ? `. ${tool.error}` : ""}`}>
    <SquareTerminal aria-hidden="true" size={14} />
    <strong>{label}{state === "failed" ? " failed" : state === "stopped" ? " stopped" : ""}</strong>
  </span>;
}
