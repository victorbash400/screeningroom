import type { AudienceWidget } from "../lib/audienceWidget";
import { channelLabel } from "../lib/mediaWorkflows";
import { useState } from "react";
import { useAgentReply } from "./useAgentReply";
import { selectedReferences } from "../lib/chatSelection";
import type { LocationInterest } from "../lib/locationInterest";
import { defaultLocationInterest } from "../lib/locationInterest";
import type { MapScene } from "../lib/mapScene";
import type { ChatChannel, Conversation, FileNode, Message, RoomData } from "../lib/types";
type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useLocalChat(
  data: RoomData,
  workspaceId: string | null,
  update: Update,
  save?: (ids: string[]) => Promise<boolean>,
) {
  const agent = useAgentReply(update, save);
  const [threads, setThreads] = useState<Record<string, string | undefined>>(
    {},
  );
  const [referenceRequest, setReferenceRequest] = useState(0);
  const [referenceId, setReferenceId] = useState<string>();
  const [channel, setChannel] = useState<ChatChannel>("chat");
  const selectionKey = `${workspaceId}:${channel}`;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const saved = data.conversations.filter(
    (item) => item.workspaceId === workspaceId && (item.channel ?? "chat") === channel,
  );
  function workspaceConversation(targetWorkspaceId: string, targetChannel = channel): Conversation {
    const existing = data.conversations.find(
      (item) => item.workspaceId === targetWorkspaceId && item.scope === "workspace" && (item.channel ?? "chat") === targetChannel,
    );
    return {
      ...(existing ?? {
        id: targetChannel === "chat" ? `workspace:${targetWorkspaceId}` : `workspace:${targetWorkspaceId}:${targetChannel}`,
        channel: targetChannel,
        workspaceId: targetWorkspaceId,
        scope: "workspace" as const,
        messages: [],
        draft: "",
      }),
      title: channelLabel(targetChannel),
      ...(targetChannel === "locations" ? { locationInterest: existing?.locationInterest ?? defaultLocationInterest } : {}),
    };
  }
  const shared = workspaceId ? workspaceConversation(workspaceId) : undefined;
  const conversations = shared
    ? [shared, ...saved.filter((item) => item.id !== shared.id)]
    : [];
  const conversation =
    conversations.find((item) => item.id === selected[selectionKey]) ??
    shared;
  function ensureWorkspaceConversation(targetWorkspaceId: string, targetChannel = channel) {
    if (data.conversations.some((item) => item.workspaceId === targetWorkspaceId && item.scope === "workspace" && (item.channel ?? "chat") === targetChannel))
      return true;
    const value = workspaceConversation(targetWorkspaceId, targetChannel);
    return update((previous) => ({
      ...previous,
      conversations: [...previous.conversations, value],
    }));
  }
  const thread = conversation?.messages.find(
    (message) => message.id === threads[conversation.id] && !message.replyToId,
  );
  function openThread(id?: string) {
    if (conversation)
      setThreads((previous) => ({ ...previous, [conversation.id]: id }));
  }
  function create(targetWorkspaceId = workspaceId, title = "New chat") {
    if (!targetWorkspaceId) return false;
    const id = crypto.randomUUID();
    const success = update((previous) => ({
      ...previous,
      conversations: [
        ...previous.conversations,
        {
          id,
          workspaceId: targetWorkspaceId,
          channel,
          ...(channel === "locations" ? { locationInterest: defaultLocationInterest } : {}),
          title,
          messages: [],
          draft: "",
        },
      ],
    }));
    if (success) {
      setSelected((previous) => ({ ...previous, [`${targetWorkspaceId}:${channel}`]: id }));
      setOpen(true);
    }
    return success;
  }
  function showFor(targetWorkspaceId: string, reference?: string) {
    setChannel("chat");
    if (conversation?.workspaceId === targetWorkspaceId) openThread();
    setReferenceId(reference);
    setReferenceRequest((previous) => previous + 1);
    if (ensureWorkspaceConversation(targetWorkspaceId, "chat"))
      setOpen(true);
  }
  function show() {
    if (workspaceId && ensureWorkspaceConversation(workspaceId)) setOpen(true);
  }
  function toggle(targetChannel: ChatChannel = "chat") {
    if (open && channel === targetChannel) setOpen(false);
    else if (workspaceId && ensureWorkspaceConversation(workspaceId, targetChannel)) {
      setChannel(targetChannel);
      setReferenceId(undefined);
      setOpen(true);
    }
  }
  function select(id: string) {
    if (id === shared?.id && workspaceId && !ensureWorkspaceConversation(workspaceId))
      return;
    setThreads((previous) => ({ ...previous, [id]: undefined }));
    if (workspaceId)
      setSelected((previous) => ({ ...previous, [selectionKey]: id }));
  }
  function draft(value: string) {
    if (!conversation) return false;
    return update((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === conversation.id
          ? thread
            ? {
                ...item,
                threadDrafts: { ...item.threadDrafts, [thread.id]: value },
              }
            : { ...item, draft: value }
          : item,
      ),
    }));
  }
  function shareReference(node: FileNode, text: string) {
    if (!ensureWorkspaceConversation(node.workspaceId, "chat")) return false;
    const destination = workspaceConversation(node.workspaceId, "chat");
    const saved = update((previous) => ({ ...previous, conversations: previous.conversations.map((item) => item.id === destination.id ? { ...item, draft: text } : item) }));
    if (saved) {
      setChannel("chat");
      setSelected((previous) => ({ ...previous, [`${node.workspaceId}:chat`]: destination.id }));
      setReferenceId(node.id);
      setReferenceRequest((previous) => previous + 1);
      setOpen(true);
    }
    return saved;
  }
  function send(text: string, referenceIds: string[] = []) {
    if (!conversation || agent.busy(conversation.id)) return false;
    const references = selectedReferences(referenceIds, data.nodes);
    const message: Message = {
      id: crypto.randomUUID(), role: "user", text: text || (references.length ? `Discuss ${references.map((node) => node.name).join(", ")}` : ""),
      references: references.map(({ id, name, kind, workspaceId }) => ({ id, name, kind, workspaceId })),
      replyToId: thread?.id, createdAt: new Date().toISOString(),
    };
    if (!message.text.trim()) return false;
    const success = update((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) => item.id === conversation.id ? {
        ...item,
        ...(thread ? { threadDrafts: { ...item.threadDrafts, [thread.id]: "" } } : { draft: "" }),
        messages: [...item.messages, message],
      } : item),
    }));
    if (success) {
      setReferenceId(undefined);
      void agent.reply(conversation.id, channel, [...conversation.messages, message], thread?.id, channel === "locations" ? conversation.locationInterest ?? defaultLocationInterest : undefined, conversation.mapScene);
    }
    return success;
  }
  return {
    setAudienceWidget: (toolId: string, widget: AudienceWidget) => conversation ? update((previous) => ({
      ...previous, conversations: previous.conversations.map((item) => item.id !== conversation.id ? item : { ...item,
        messages: item.messages.map((message) => ({ ...message, blocks: message.blocks?.map((block) => block.kind === "tool" && block.tool.id === toolId ? { ...block, tool: { ...block.tool, widget } } : block) })),
      }),
    })) : false,
    setMapScene: (mapScene: MapScene) => conversation ? update((previous) => ({
      ...previous, conversations: previous.conversations.map((item) => item.id === conversation.id ? { ...item, mapScene } : item),
    })) : false,
    setLocationInterest: (locationInterest?: LocationInterest) => conversation ? update((previous) => ({
      ...previous, conversations: previous.conversations.map((item) => item.id === conversation.id ? { ...item, locationInterest } : item),
    })) : false,
    channel,
    discard: agent.discard,
    error: agent.error,
    clearError: agent.clearError,
    show,
    thread,
    openThread,
    draftValue: thread
      ? (conversation?.threadDrafts?.[thread.id] ?? "")
      : (conversation?.draft ?? ""),
    showFor,
    shareReference,
    referenceId,
    referenceRequest,
    setReferenceId,
    open: open && Boolean(conversation),
    conversation: conversation ? {
      ...conversation,
      locationInterest: agent.pendingAreas[conversation.id] ?? conversation.locationInterest,
      mapScene: agent.pendingMaps[conversation.id] ?? conversation.mapScene,
      messages: agent.pending[conversation.id] ? [...conversation.messages, agent.pending[conversation.id]!] : conversation.messages,
    } : undefined,
    busy: conversation ? agent.busy(conversation.id) : false,
    stop: () => { if (conversation) agent.stop(conversation.id); },
    conversations,
    create: () => create(),
    toggle,
    select,
    draft,
    send,
    close: () => setOpen(false),
  };
}
