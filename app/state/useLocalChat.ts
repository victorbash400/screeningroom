import { useState } from "react";
import { useAgentReply } from "./useAgentReply";
import type { ChatChannel, Conversation, FileNode, Message, RoomData } from "../lib/types";
type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useLocalChat(
  data: RoomData,
  workspaceId: string | null,
  update: Update,
) {
  const agent = useAgentReply(update);
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
      title: "Chats",
    };
  }
  const shared = workspaceId ? workspaceConversation(workspaceId) : undefined;
  const conversations = shared
    ? [shared, ...saved.filter((item) => item.scope !== "workspace")]
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
    const destination =
      data.conversations.find(
        (item) =>
          item.workspaceId === node.workspaceId &&
          item.id === selected[`${node.workspaceId}:chat`],
      ) ??
      workspaceConversation(node.workspaceId, "chat");
    const id = destination.id;
    if (agent.busy(id)) return false;
    const message: Message = {
      role: "user",
      id: crypto.randomUUID(),
      text: text || `Discuss ${node.name}`,
      referenceId: node.id,
      referenceName: node.name,
      referenceKind: node.kind,
      createdAt: new Date().toISOString(),
    };
    const success = update((previous) => {
      if (!previous.nodes.some((item) => item.id === node.id))
        throw new Error("Item no longer exists.");
      return {
        ...previous,
        conversations: previous.conversations.some((item) => item.id === id)
          ? previous.conversations.map((item) =>
              item.id === id
                ? { ...item, messages: [...item.messages, message] }
                : item,
            )
          : [
              ...previous.conversations,
              {
                ...destination,
                messages: [message],
                draft: "",
              },
            ],
      };
    });
    if (success) {
      setChannel("chat");
      setThreads((previous) => ({ ...previous, [id]: undefined }));
      setSelected((previous) => ({ ...previous, [`${node.workspaceId}:chat`]: id }));
      setReferenceId(undefined);
      setOpen(true);
      void agent.reply(id, "chat", [...destination.messages, message], undefined, node, data.nodes);
    }
    return success;
  }
  function send(text: string, referenceId?: string) {
    if (!conversation || agent.busy(conversation.id)) return false;
    const reference = referenceId ? data.nodes.find((node) => node.id === referenceId) : undefined;
    const message: Message = {
      id: crypto.randomUUID(), role: "user", text: text || (reference ? `Discuss ${reference.name}` : ""),
      referenceId, referenceName: reference?.name, referenceKind: reference?.kind,
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
      void agent.reply(conversation.id, channel, [...conversation.messages, message], thread?.id, reference, data.nodes);
    }
    return success;
  }
  return {
    channel,
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
    conversation: conversation && agent.pending[conversation.id]
      ? { ...conversation, messages: [...conversation.messages, agent.pending[conversation.id]!] }
      : conversation,
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
