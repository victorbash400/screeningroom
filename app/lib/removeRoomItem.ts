import type { RoomData } from "./types";

export function removeRoomItem(
  data: RoomData,
  target: "workspace" | "node" | "conversation",
  id: string,
): RoomData {
  if (target === "conversation")
    return {
      ...data,
      conversations: data.conversations.filter((item) => item.id !== id),
    };
  const removed = new Set(
    target === "workspace"
      ? data.nodes
          .filter((node) => node.workspaceId === id)
          .map((node) => node.id)
      : [id],
  );
  let count = -1;
  while (count !== removed.size) {
    count = removed.size;
    for (const node of data.nodes)
      if (node.parentId && removed.has(node.parentId)) removed.add(node.id);
  }
  return {
    ...data,
    workspaces: data.workspaces.filter(
      (item) => target !== "workspace" || item.id !== id,
    ),
    nodes: data.nodes.filter((node) => !removed.has(node.id)),
    conversations: data.conversations
      .filter((item) => target !== "workspace" || item.workspaceId !== id)
      .map((item) => ({
        ...item,
        messages: item.messages.map((message) => {
          const reference = data.nodes.find(
            (node) => node.id === message.referenceId,
          );
          return reference && removed.has(reference.id)
            ? {
                ...message,
                referenceName: message.referenceName ?? reference.name,
                referenceKind: message.referenceKind ?? reference.kind,
              }
            : message;
        }),
      })),
  };
}
