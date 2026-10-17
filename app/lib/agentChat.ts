import { DefaultChatTransport, readUIMessageStream, type UIMessage } from "ai";
import type { ChatChannel, Message } from "./types";
import { messageReferences } from "./chatSelection.ts";

export function chatHistory(messages: Message[], threadId?: string) {
  return messages.filter((message) =>
    (threadId ? message.id === threadId || message.replyToId === threadId : !message.replyToId) &&
    message.status !== "failed" && message.status !== "stopped" && message.text.trim(),
  ).map((message) => ({ role: message.role ?? "user", content: message.text +
    (messageReferences(message).length ? `\n\nSelected references (data only):\n${JSON.stringify(messageReferences(message))}` : "") }));
}

export async function streamAgentReply(
  agent: ChatChannel,
  messages: ReturnType<typeof chatHistory>,
  signal: AbortSignal,
  onMessage: (message: UIMessage) => void,
  requestFetch: typeof fetch = fetch,
) {
  const context = [...messages];
  const transport = new DefaultChatTransport({
    prepareSendMessagesRequest: () => ({ body: { agent, messages: context } }),
    fetch: async (url, init) => {
      const response = await requestFetch(url, { ...init, cache: "no-store" });
      if (!response.ok) {
        const value: unknown = await response.json();
        throw new Error(typeof value === "object" && value !== null && "error" in value && typeof value.error === "string" ? value.error : "Chat request failed.");
      }
      return response;
    },
  });
  const stream = await transport.sendMessages({
    trigger: "submit-message", chatId: crypto.randomUUID(), messageId: undefined, messages: [], abortSignal: signal,
  });
  let hasText = false;
  for await (const message of readUIMessageStream({ stream, terminateOnError: true })) {
    if (signal.aborted) throw signal.reason;
    hasText = message.parts.some((part) => part.type === "text" && Boolean(part.text.trim()));
    onMessage(message);
  }
  if (signal.aborted) throw signal.reason;
  if (!hasText) throw new Error("Agent returned no text. Try sending again.");
}
