import type { RoomData } from "./types.ts";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function mergeItems<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const before = new Map(base.map((item) => [item.id, item]));
  const own = new Map(local.map((item) => [item.id, item]));
  const other = new Map(remote.map((item) => [item.id, item]));
  const result: T[] = [];
  for (const id of new Set([...other.keys(), ...own.keys(), ...before.keys()])) {
    const initial = before.get(id), desired = own.get(id), current = other.get(id);
    if (same(desired, initial) || same(desired, current)) { if (current) result.push(current); }
    else if (same(current, initial)) { if (desired) result.push(desired); }
    else throw new Error("Conflicting edits. Your unsaved version is still open.");
  }
  return result;
}
export function mergeRoom(base: RoomData, local: RoomData, remote: RoomData): RoomData {
  return { version: 1, workspaces: mergeItems(base.workspaces, local.workspaces, remote.workspaces), nodes: mergeItems(base.nodes, local.nodes, remote.nodes), conversations: mergeItems(base.conversations, local.conversations, remote.conversations), activity: mergeItems(base.activity ?? [], local.activity ?? [], remote.activity ?? []) };
}
