import type { RoomData } from "./types.ts";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export interface RoomConflict { kind: "Workspace" | "File" | "Folder" | "Chat" | "Activity"; id: string; name: string }
export class RoomConflictError extends Error {
  constructor(public conflicts: RoomConflict[]) {
    super("Conflicting edits. Your unsaved version is still open.");
    this.name = "RoomConflictError";
  }
}
function mergeItems<T extends { id: string }>(base: T[], local: T[], remote: T[], kind: RoomConflict["kind"], conflicts: RoomConflict[]): T[] {
  const before = new Map(base.map((item) => [item.id, item]));
  const own = new Map(local.map((item) => [item.id, item]));
  const other = new Map(remote.map((item) => [item.id, item]));
  const result: T[] = [];
  for (const id of new Set([...other.keys(), ...own.keys(), ...before.keys()])) {
    const initial = before.get(id), desired = own.get(id), current = other.get(id);
    if (same(desired, initial) || same(desired, current)) { if (current) result.push(current); }
    else if (same(current, initial)) { if (desired) result.push(desired); }
    else {
      const item = desired ?? current ?? initial;
      const name = item && "name" in item && typeof item.name === "string" ? item.name
        : item && "title" in item && typeof item.title === "string" ? item.title : id;
      conflicts.push({ kind: kind === "File" && item && "kind" in item && item.kind === "folder" ? "Folder" : kind, id, name });
    }
  }
  return result;
}
export function mergeRoom(base: RoomData, local: RoomData, remote: RoomData): RoomData {
  const conflicts: RoomConflict[] = [];
  const merged: RoomData = {
    version: 1,
    workspaces: mergeItems(base.workspaces, local.workspaces, remote.workspaces, "Workspace", conflicts),
    nodes: mergeItems(base.nodes, local.nodes, remote.nodes, "File", conflicts),
    conversations: mergeItems(base.conversations, local.conversations, remote.conversations, "Chat", conflicts),
    activity: mergeItems(base.activity ?? [], local.activity ?? [], remote.activity ?? [], "Activity", conflicts),
  };
  if (conflicts.length) throw new RoomConflictError(conflicts);
  return merged;
}
