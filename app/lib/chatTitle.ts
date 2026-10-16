import { z } from "zod";
import type { Conversation, Message } from "./types";

export const chatTitleSchema = z.object({
  title: z.string().trim().min(1).refine((title) => {
    const words = Array.from(new Intl.Segmenter(undefined, { granularity: "word" }).segment(title))
      .filter((segment) => segment.isWordLike);
    return words.length > 0 && words.length <= 6;
  }, "Chat titles must contain one to six words."),
}).strict();

export function canNameChat(conversation: Conversation, firstMessageId: string) {
  return conversation.scope !== "workspace" && conversation.title === "New chat" &&
    conversation.messages.find((message) => message.role !== "assistant")?.id === firstMessageId;
}

export function isFirstChatReply(messages: Message[], reply: Message) {
  return !reply.replyToId && reply.status === "complete" &&
    messages.length === 1 && messages[0].role !== "assistant";
}
