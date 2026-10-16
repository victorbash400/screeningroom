import { getToolName, isToolUIPart } from "ai";
import { useAccount } from "./AccountContext";
import { useEffect, useRef, useState } from "react";
import { waitingForAnswer } from "../lib/agentActivity";
import { chatReference } from "../lib/chatReference";
import { chatHistory, streamAgentReply } from "../lib/agentChat";
import type { ChatChannel, FileNode, Message, RoomData } from "../lib/types";

type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useAgentReply(update: Update) {
  const account = useAccount();
  const [error, setError] = useState<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const [pending, setPending] = useState<Record<string, Message | undefined>>({});
  useEffect(() => {
    const active = controllers.current;
    return () => { for (const controller of active.values()) controller.abort(); active.clear(); };
  }, []);

  async function reply(conversationId: string, channel: ChatChannel, messages: Message[], threadId?: string, reference?: FileNode, nodes: FileNode[] = []) {
    if (controllers.current.has(conversationId)) return;
    setError(null);
    const controller = new AbortController();
    controllers.current.set(conversationId, controller);
    let current: Message = { id: crypto.randomUUID(), role: "assistant", text: "", createdAt: new Date().toISOString(), replyToId: threadId, status: "streaming", waiting: true };
    setPending((previous) => ({ ...previous, [conversationId]: current }));
    try {
      const history = chatHistory(messages, threadId);
      if (reference && history.length) history[history.length - 1].content = history[history.length - 1].content + await chatReference(reference, nodes, account.user?.id);
      await streamAgentReply(channel, history, controller.signal, (message) => {
        current = {
          ...current,
          waiting: waitingForAnswer(message),
          text: message.parts.filter((part) => part.type === "text").map((part) => part.text).join(""),
          tools: message.parts.flatMap((part) => {
            if (!isToolUIPart(part)) return [];
            return [{ id: part.toolCallId, name: getToolName(part), state: part.state === "output-available" ? "done" as const : part.state === "output-error" ? "failed" as const : "running" as const }];
          }),
        };
        setPending((previous) => ({ ...previous, [conversationId]: current }));
      }, account.fetch);
      current = { ...current, status: "complete", waiting: false };
    } catch (error) {
      if (!controllers.current.has(conversationId)) return;
      const stopped = controller.signal.aborted;
      const message = stopped ? "Response stopped." : error instanceof Error ? error.message : "Agent response failed. Try sending again.";
      current = { ...current, status: stopped ? "stopped" : "failed", error: stopped ? undefined : message, waiting: false };
      if (!stopped) setError(message);
    } finally {
      if (controllers.current.get(conversationId) === controller) {
        const saved = update((previous) => ({ ...previous, conversations: previous.conversations.map((item) => item.id === conversationId ? { ...item, messages: [...item.messages, current] } : item) }));
        controllers.current.delete(conversationId);
        if (saved) setPending((previous) => ({ ...previous, [conversationId]: undefined }));
        else {
          setError("Cannot save reply. Retry saving your workspace.");
          setPending((previous) => ({ ...previous, [conversationId]: { ...current, status: "failed", error: "Cannot save reply. Retry saving your workspace." } }));
        }
      }
    }
  }
  return { reply, pending, error, clearError: () => setError(null), busy: (id: string) => controllers.current.has(id), stop: (id: string) => controllers.current.get(id)?.abort() };
}
