import { useState } from "react";
import type { FileNode, RoomData } from "../lib/types";
type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useLocalChat(
  data: RoomData,
  workspaceId: string | null,
  update: Update,
) {
  const [threads, setThreads] = useState<Record<string, string | undefined>>(
    {},
  );
  const [referenceRequest, setReferenceRequest] = useState(0);
  const [referenceId, setReferenceId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const conversations = data.conversations.filter(
    (item) => item.workspaceId === workspaceId,
  );
  const conversation =
    conversations.find((item) => item.id === selected[workspaceId ?? ""]) ??
    conversations.at(-1);
  const thread = conversation?.messages.find(
    (message) => message.id === threads[conversation.id] && !message.replyToId,
  );
  function openThread(id?: string) {
    if (conversation)
      setThreads((previous) => ({ ...previous, [conversation.id]: id }));
  }
  function create(targetWorkspaceId = workspaceId, title = "New conversation") {
    if (!targetWorkspaceId) return false;
    const id = crypto.randomUUID();
    const success = update((previous) => ({
      ...previous,
      conversations: [
        ...previous.conversations,
        {
          id,
          workspaceId: targetWorkspaceId,
          title,
          messages: [],
          draft: "",
        },
      ],
    }));
    if (success) {
      setSelected((previous) => ({ ...previous, [targetWorkspaceId]: id }));
      setOpen(true);
    }
    return success;
  }
  function showFor(targetWorkspaceId: string, reference?: string) {
    if (conversation?.workspaceId === targetWorkspaceId) openThread();
    setReferenceId(reference);
    setReferenceRequest((previous) => previous + 1);
    if (
      data.conversations.some((item) => item.workspaceId === targetWorkspaceId)
    )
      setOpen(true);
    else create(targetWorkspaceId);
  }
  function show() {
    if (conversation) setOpen(true);
    else create();
  }
  function toggle() {
    if (open) setOpen(false);
    else if (conversation) setOpen(true);
    else create();
  }
  function select(id: string) {
    setThreads((previous) => ({ ...previous, [id]: undefined }));
    if (workspaceId)
      setSelected((previous) => ({ ...previous, [workspaceId]: id }));
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
          item.id === selected[node.workspaceId],
      ) ??
      data.conversations
        .filter((item) => item.workspaceId === node.workspaceId)
        .at(-1);
    const id = destination?.id ?? crypto.randomUUID();
    const message = {
      id: crypto.randomUUID(),
      text,
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
        conversations: destination
          ? previous.conversations.map((item) =>
              item.id === id
                ? { ...item, messages: [...item.messages, message] }
                : item,
            )
          : [
              ...previous.conversations,
              {
                id,
                workspaceId: node.workspaceId,
                title: node.name,
                messages: [message],
                draft: "",
              },
            ],
      };
    });
    if (success) {
      setThreads((previous) => ({ ...previous, [id]: undefined }));
      setSelected((previous) => ({ ...previous, [node.workspaceId]: id }));
      setReferenceId(undefined);
      setOpen(true);
    }
    return success;
  }
  function send(text: string, referenceId?: string) {
    if (!conversation) return false;
    const reference = referenceId
      ? data.nodes.find((node) => node.id === referenceId)
      : undefined;
    const success = update((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              title:
                item.messages.length || item.title !== "New conversation"
                  ? item.title
                  : text.slice(0, 50) || "Conversation",
              ...(thread
                ? { threadDrafts: { ...item.threadDrafts, [thread.id]: "" } }
                : { draft: "" }),
              messages: [
                ...item.messages,
                {
                  id: crypto.randomUUID(),
                  text,
                  referenceId,
                  referenceName: reference?.name,
                  referenceKind: reference?.kind,
                  ...(thread ? { replyToId: thread.id } : {}),
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : item,
      ),
    }));
    if (success) setReferenceId(undefined);
    return success;
  }
  return {
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
    conversation,
    conversations,
    create: (title: string) => create(workspaceId, title || "New conversation"),
    toggle,
    select,
    draft,
    send,
    close: () => setOpen(false),
  };
}
