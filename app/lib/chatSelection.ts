import type { FileNode, Message } from "./types.ts";

export function selectedReferences(ids: string[], nodes: FileNode[]) {
  const selected = new Set(ids);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return Array.from(selected).flatMap((id) => {
    const node = byId.get(id);
    if (!node) return [];
    let parent = node.parentId;
    while (parent) {
      if (selected.has(parent)) return [];
      parent = byId.get(parent)?.parentId ?? null;
    }
    return [node];
  });
}

export function messageReferences(message: Message) {
  return message.references ?? (message.referenceId && message.referenceName && message.referenceKind
    ? [{ id: message.referenceId, name: message.referenceName, kind: message.referenceKind }] : []);
}
