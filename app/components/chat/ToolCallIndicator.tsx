import { Check, CircleAlert, SquareTerminal } from "lucide-react";
import type { Message } from "../../lib/types";
import styles from "./ToolCallIndicator.module.css";

export default function ToolCallIndicator({ tool, status }: { tool: NonNullable<Message["tools"]>[number]; status?: Message["status"] }) {
  const failed = tool.state === "failed" || (status === "failed" && tool.state === "running");
  const stopped = status === "stopped" && tool.state === "running";
  const Icon = failed ? CircleAlert : tool.state === "done" ? Check : SquareTerminal;
  const label = tool.name === "searchEntities" ? "Qloo search" : tool.name === "tasteInsights" ? "Qloo insights" : tool.name;
  return <div className={styles.tool} data-state={failed ? "failed" : stopped ? "stopped" : tool.state} role="status"><Icon size={13} /><span>{label}{failed ? " failed" : stopped ? " stopped" : ""}</span></div>;
}
