import type { ActivityEntry, RoomData } from "./types";
import { folderPath } from "./storage";
export function recordActivity(previous: RoomData, next: RoomData): RoomData {
  const entries: ActivityEntry[] = [];
  const oldNodes = new Map(previous.nodes.map((node) => [node.id, node]));
  const newNodes = new Map(next.nodes.map((node) => [node.id, node]));
  for (const node of [
    ...next.nodes,
    ...previous.nodes.filter((item) => !newNodes.has(item.id)),
  ]) {
    const before = oldNodes.get(node.id);
    const after = newNodes.get(node.id);
    const action = !before
      ? "Create"
      : !after
        ? "Delete"
        : before.parentId !== after.parentId
          ? "Move"
          : before.name !== after.name
            ? "Rename"
            : before.content !== after.content
              ? "Write"
              : null;
    if (!action) continue;
    const source = after ? next : previous;
    entries.push({
      id: crypto.randomUUID(),
      name: [
        ...folderPath(source, node.parentId).map((parent) => parent.name),
        node.name,
      ].join("/"),
      action,
      workspace:
        source.workspaces.find((workspace) => workspace.id === node.workspaceId)
          ?.name ?? "",
      createdAt: new Date().toISOString(),
      bytes: node.size ?? 0,
    });
  }
  return entries.length
    ? { ...next, activity: [...entries.reverse(), ...(next.activity ?? [])] }
    : next;
}
