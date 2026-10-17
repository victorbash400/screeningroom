import type { ChatChannel } from "./types";

export const mediaWorkflows = [
  { channel: "similar", label: "Similar media", action: "Find similar media", placeholder: "Name, describe, or select media to find similar work" },
  { channel: "compare", label: "Compare", action: "Compare with existing media", placeholder: "Name or select the media you want to compare" },
  { channel: "fit", label: "Audience fit", action: "Explore audience fit", placeholder: "Name, describe, or select media to explore its audience" },
  { channel: "performance", label: "Performance", action: "Check media or project performance", placeholder: "Select performance data or name existing media" },
] as const;
export type MediaWorkflow = typeof mediaWorkflows[number]["channel"];
export const workflowFor = (channel: ChatChannel) => mediaWorkflows.find((item) => item.channel === channel);
export const channelLabel = (channel: ChatChannel) => workflowFor(channel)?.label ?? (channel === "locations" ? "Audience" : "Chats");
