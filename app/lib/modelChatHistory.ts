import { z } from "zod";
import type { ModelMessage } from "ai";

export const historyToolSchema = z.object({ id: z.string().min(1), name: z.string().min(1), input: z.record(z.string(), z.json()), output: z.json() }).strict();
export type HistoryTool = z.infer<typeof historyToolSchema>;
export const historyMessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1), tools: z.array(historyToolSchema).optional() }).strict().refine((message) => message.role === "assistant" || !message.tools?.length, "Only assistant messages can contain tool history.");

export function modelChatHistory(messages: z.infer<typeof historyMessageSchema>[]): ModelMessage[] {
  return messages.flatMap((message): ModelMessage[] => {
    if (message.role !== "assistant" || !message.tools?.length) return [{ role: message.role, content: message.content }];
    return [
      { role: "assistant", content: message.tools.map((tool) => ({ type: "tool-call" as const, toolCallId: tool.id, toolName: tool.name, input: tool.input })) },
      { role: "tool", content: message.tools.map((tool) => ({ type: "tool-result" as const, toolCallId: tool.id, toolName: tool.name, output: { type: "json" as const, value: tool.output } })) },
      { role: "assistant", content: message.content },
    ];
  });
}
