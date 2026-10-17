import type { Message, MessageBlock, MessageTool } from "./types.ts";
import { similarResultsSchema } from "./similarResults.ts";

export function messageBlocks(message: Message): MessageBlock[] {
  if (message.blocks) return message.blocks;
  // Older saved replies contain no position information for their tool calls.
  return [
    ...(message.tools ?? []).map((tool): MessageBlock => ({ id: `tool:${tool.id}`, kind: "tool", tool })),
    ...(message.text ? [{ id: "text", kind: "text" as const, text: message.text }] : []),
  ];
}

export function finishReply(message: Message, status: "complete" | "stopped" | "failed", error?: string): Message {
  if (status === "complete" && message.blocks?.some((block) => block.kind === "tool" && block.tool.state === "running")) {
    throw new Error("Tool call ended without a result.");
  }
  return {
    ...message, status, error, waiting: false,
    blocks: message.blocks?.map((block) => block.kind === "tool" && block.tool.state === "running"
      ? { ...block, tool: { ...block.tool, state: status === "stopped" ? "stopped" : "failed" } }
      : block),
  };
}

function validMessageTool(value: unknown): value is MessageTool {
  if (typeof value !== "object" || value === null) return false;
  const tool = value as Record<string, unknown>;
  return typeof tool.id === "string" && Boolean(tool.id) && typeof tool.name === "string" && Boolean(tool.name) &&
    (tool.error === undefined || typeof tool.error === "string") &&
    (tool.results === undefined || similarResultsSchema.safeParse(tool.results).success) &&
    typeof tool.state === "string" && ["running", "done", "failed", "stopped"].includes(tool.state);
}
export function validMessageTools(value: unknown): value is MessageTool[] {
  return Array.isArray(value) && value.every(validMessageTool);
}
export function validMessageBlocks(value: unknown): value is MessageBlock[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const block of value) {
    if (typeof block !== "object" || block === null || typeof block.id !== "string" || !block.id || ids.has(block.id)) return false;
    ids.add(block.id);
    if (block.kind === "text") {
      if (typeof block.text !== "string") return false;
    } else if (block.kind === "tool") {
      if (!validMessageTool(block.tool)) return false;
    } else return false;
  }
  return true;
}
