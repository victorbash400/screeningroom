import { useAccount } from "./AccountContext";
import { useChatTitle } from "./useChatTitle";
import { canNameChat, isFirstChatReply } from "../lib/chatTitle";
import { useEffect, useRef, useState } from "react";
import { finishReply } from "../lib/messageBlocks";
import { agentBlocks, waitingForAnswer } from "../lib/agentActivity";
import { chatReference } from "../lib/chatReference";
import { chatHistory, streamAgentReply } from "../lib/agentChat";
import type { LocationInterest } from "../lib/locationInterest";
import { getToolName, isToolUIPart } from "ai";
import { mapPresentationSchema, type MapScene } from "../lib/mapScene";
import type { ChatChannel, FileNode, Message, RoomData } from "../lib/types";

type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useAgentReply(update: Update) {
  const account = useAccount();
  const [error, setError] = useState<string | null>(null);
  const nameChat = useChatTitle(update, setError);
  const controllers = useRef(new Map<string, AbortController>());
  const [pending, setPending] = useState<Record<string, Message | undefined>>({});
  const [pendingMaps, setPendingMaps] = useState<Record<string, MapScene | undefined>>({});
  useEffect(() => {
    const active = controllers.current;
    return () => { for (const controller of active.values()) controller.abort(); active.clear(); };
  }, []);

  async function reply(conversationId: string, channel: ChatChannel, messages: Message[], threadId?: string, reference?: FileNode | FileNode[], nodes: FileNode[] = [], locationInterest?: LocationInterest) {
    if (controllers.current.has(conversationId)) return;
    setError(null);
    const controller = new AbortController();
    controllers.current.set(conversationId, controller);
    let current: Message = { id: crypto.randomUUID(), role: "assistant", text: "", createdAt: new Date().toISOString(), replyToId: threadId, status: "streaming", waiting: true };
    let mapScene: MapScene | undefined;
    setPending((previous) => ({ ...previous, [conversationId]: current }));
    try {
      const history = chatHistory(messages, threadId);
      const mapCalls = new Set<string>();
      if (reference && history.length) {
        const references = Array.isArray(reference) ? reference : [reference];
        const context = await Promise.all(references.map((node) => chatReference(node, nodes, account.user?.id)));
        history[history.length - 1].content += context.join("");
      }
      await streamAgentReply(channel, history, controller.signal, (message) => {
        for (const part of message.parts) {
          if (!isToolUIPart(part) || getToolName(part) !== "showMapLocations" || part.state !== "output-available" || mapCalls.has(part.toolCallId)) continue;
          const presentation = mapPresentationSchema.parse(part.output);
          mapScene = { id: part.toolCallId, presentation };
          setPendingMaps((previous) => ({ ...previous, [conversationId]: mapScene }));
          mapCalls.add(part.toolCallId);
        }
        current = {
          ...current,
          waiting: waitingForAnswer(message),
          blocks: agentBlocks(message),
          text: message.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n\n"),
        };
        setPending((previous) => ({ ...previous, [conversationId]: current }));
      }, account.fetch, locationInterest);
      current = finishReply(current, "complete");
    } catch (error) {
      if (!controllers.current.has(conversationId)) return;
      const stopped = controller.signal.aborted;
      const message = stopped ? "Response stopped." : error instanceof Error ? error.message : "Agent response failed. Try sending again.";
      current = finishReply(current, stopped ? "stopped" : "failed", stopped ? undefined : message);
      if (!stopped) setError(message);
    } finally {
      if (controllers.current.get(conversationId) === controller) {
        let shouldName = false;
        const saved = update((previous) => ({ ...previous, conversations: previous.conversations.map((item) => {
          if (item.id !== conversationId) return item;
          shouldName = isFirstChatReply(messages, current) && canNameChat(item, messages[0].id);
          return { ...item, ...(mapScene ? { mapScene } : {}), messages: [...item.messages, current] };
        }) }));
        controllers.current.delete(conversationId);
        if (saved) {
          setPendingMaps((previous) => ({ ...previous, [conversationId]: undefined }));
          setPending((previous) => ({ ...previous, [conversationId]: undefined }));
          if (shouldName) void nameChat(conversationId, messages[0].id, messages[0].text, current.text);
        }
        else {
          setError("Cannot save reply. Retry saving your workspace.");
          setPending((previous) => ({ ...previous, [conversationId]: { ...current, status: "failed", error: "Cannot save reply. Retry saving your workspace." } }));
        }
      }
    }
  }
  return { reply, pending, pendingMaps, error, clearError: () => setError(null), busy: (id: string) => controllers.current.has(id), stop: (id: string) => controllers.current.get(id)?.abort() };
}
