import { useAccount } from "./AccountContext";
import { useChatTitle } from "./useChatTitle";
import { canNameChat, isFirstChatReply } from "../lib/chatTitle";
import { useEffect, useRef, useState } from "react";
import { finishReply } from "../lib/messageBlocks";
import { agentBlocks, waitingForAnswer } from "../lib/agentActivity";
import { messageReferences } from "../lib/chatSelection";
import { chatHistory, streamAgentReply } from "../lib/agentChat";
import type { LocationInterest } from "../lib/locationInterest";
import { getToolName, isToolUIPart } from "ai";
import { audienceMapUpdate } from "../lib/audienceMapUpdate";
import type { MapScene } from "../lib/mapScene";
import type { ChatChannel, Message, MessageTool, RoomData } from "../lib/types";

type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useAgentReply(update: Update, save?: (ids: string[]) => Promise<boolean>) {
  const account = useAccount();
  const [error, setError] = useState<string | null>(null);
  const nameChat = useChatTitle(update, setError);
  const controllers = useRef(new Map<string, AbortController>());
  const [pending, setPending] = useState<Record<string, Message | undefined>>({});
  const [pendingAreas, setPendingAreas] = useState<Record<string, LocationInterest | undefined>>({});
  const [pendingMaps, setPendingMaps] = useState<Record<string, MapScene | undefined>>({});
  useEffect(() => {
    const active = controllers.current;
    return () => { for (const controller of active.values()) controller.abort(); active.clear(); };
  }, []);

  async function reply(conversationId: string, channel: ChatChannel, messages: Message[], threadId?: string, locationInterest?: LocationInterest, initialScene?: MapScene) {
    if (controllers.current.has(conversationId)) return;
    setError(null);
    const controller = new AbortController();
    controllers.current.set(conversationId, controller);
    let current: Message = { id: crypto.randomUUID(), role: "assistant", text: "", createdAt: new Date().toISOString(), replyToId: threadId, status: "streaming", waiting: true };
    let mapScene: MapScene | undefined;
    let locationArea: LocationInterest | undefined;
    setPending((previous) => ({ ...previous, [conversationId]: current }));
    const selectedIds = [...new Set(messages.at(-1) ? messageReferences(messages.at(-1)!).map((reference) => reference.id) : [])];
    try {
      if (selectedIds.length && save && !await save(selectedIds)) throw new Error("Save the workspace before analyzing selected media.");
      controller.signal.throwIfAborted();
      const history = chatHistory(messages, threadId);
      const mapCalls = new Set<string>();
      const completedTools = new Map<string, MessageTool>();
      await streamAgentReply(channel, history, controller.signal, (message) => {
        if (controllers.current.get(conversationId) !== controller) return;
        for (const part of message.parts) {
          if (!isToolUIPart(part) || part.state !== "output-available" || mapCalls.has(part.toolCallId)) continue;
          const change = audienceMapUpdate(getToolName(part), part.output, part.toolCallId, mapScene ?? initialScene);
          if (change.area) {
            locationArea = change.area;
            setPendingAreas((previous) => ({ ...previous, [conversationId]: locationArea }));
          }
          if (change.scene) {
            mapScene = change.scene;
            setPendingMaps((previous) => ({ ...previous, [conversationId]: mapScene }));
          }
          mapCalls.add(part.toolCallId);
        }
        current = {
          ...current,
          waiting: waitingForAnswer(message),
          blocks: agentBlocks(message, completedTools),
          text: message.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n\n"),
        };
        setPending((previous) => ({ ...previous, [conversationId]: current }));
      }, account.fetch, locationInterest, initialScene, selectedIds);
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
          return { ...item, ...(locationArea ? { locationInterest: locationArea } : {}), ...(mapScene ? { mapScene } : {}), messages: [...item.messages, current] };
        }) }));
        controllers.current.delete(conversationId);
        if (saved) {
          setPendingAreas((previous) => ({ ...previous, [conversationId]: undefined }));
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
  function discard(id: string) {
    const controller = controllers.current.get(id);
    controllers.current.delete(id);
    controller?.abort();
    setPending((previous) => ({ ...previous, [id]: undefined }));
    setPendingMaps((previous) => ({ ...previous, [id]: undefined }));
    setPendingAreas((previous) => ({ ...previous, [id]: undefined }));
  }
  return { discard, reply, pendingAreas, pending, pendingMaps, error, clearError: () => setError(null), busy: (id: string) => controllers.current.has(id), stop: (id: string) => controllers.current.get(id)?.abort() };
}
