import { useEffect, useRef } from "react";
import { useAccount } from "./AccountContext";
import { canNameChat, chatTitleSchema } from "../lib/chatTitle";
import type { RoomData } from "../lib/types";

type Update = (change: (data: RoomData) => RoomData) => boolean;

export function useChatTitle(update: Update, onError: (error: string) => void) {
  const account = useAccount();
  const controllers = useRef(new Set<AbortController>());
  useEffect(() => {
    const active = controllers.current;
    return () => { for (const controller of active) controller.abort(); active.clear(); };
  }, []);

  return async (id: string, firstMessageId: string, user: string, assistant: string) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const response = await account.fetch("/api/chat/title", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, assistant }), signal: controller.signal,
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error("Could not name chat. Rename it from chat history.");
      const parsed = chatTitleSchema.safeParse(result);
      if (!parsed.success)
        throw new Error("Chat title was invalid. Rename it from chat history.");
      const { title } = parsed.data;
      if (controller.signal.aborted) return;
      const saved = update((previous) => ({ ...previous, conversations: previous.conversations.map((item) =>
        item.id === id && canNameChat(item, firstMessageId) ? { ...item, title } : item,
      ) }));
      if (!saved) onError("Cannot save chat title. Retry saving your workspace.");
    } catch (error) {
      if (!controller.signal.aborted) onError(error instanceof Error ? error.message : "Could not name chat. Rename it from chat history.");
    } finally { controllers.current.delete(controller); }
  };
}
