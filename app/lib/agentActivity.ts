import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { MessageBlock } from "./types.ts";

export function agentBlocks(message: UIMessage): MessageBlock[] {
  return message.parts.flatMap((part, index): MessageBlock[] => {
    if (part.type === "text") return [{ id: `text:${index}`, kind: "text", text: part.text }];
    if (!isToolUIPart(part)) return [];
    return [{
      id: `tool:${part.toolCallId}`, kind: "tool",
      tool: {
        id: part.toolCallId, name: getToolName(part),
        ...(part.state === "output-error" ? { error: part.errorText } : part.state === "output-denied" ? { error: "Tool call denied." } : {}),
        state: part.state === "output-available" ? "done" : part.state === "output-error" || part.state === "output-denied" ? "failed" : "running",
      },
    }];
  });
}

export function waitingForAnswer(message: UIMessage) {
  const last = message.parts.at(-1);
  if (!last) return true;
  if (last.type === "text") return last.state === "done";
  if (isToolUIPart(last)) return last.state === "output-available" || last.state === "output-error" || last.state === "output-denied";
  return true;
}
