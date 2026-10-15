import type { RoomData } from "./types";
import { parseLink } from "./linkFiles.ts";

export const storageKey = "screeningroom.v1";
export const emptyData: RoomData = {
  version: 1,
  workspaces: [],
  nodes: [],
  conversations: [],
};
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown): value is string => typeof value === "string";
const date = (value: unknown) =>
  text(value) && Number.isFinite(Date.parse(value));

export function parseData(raw: string): RoomData {
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.workspaces) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.conversations)
  )
    throw new Error("Saved workspace data is invalid.");
  if (value.activity !== undefined) {
    const ids = new Set<string>();
    if (!Array.isArray(value.activity))
      throw new Error("Saved activity is invalid.");
    for (const entry of value.activity) {
      if (
        !record(entry) ||
        !text(entry.id) ||
        ids.has(entry.id) ||
        !text(entry.name) ||
        !text(entry.workspace) ||
        !date(entry.createdAt) ||
        !["Create", "Delete", "Move", "Rename", "Write"].includes(
          String(entry.action),
        ) ||
        typeof entry.bytes !== "number" ||
        !Number.isFinite(entry.bytes) ||
        entry.bytes < 0
      )
        throw new Error("Saved activity is invalid.");
      ids.add(entry.id);
    }
  }
  const workspaces = new Set<string>();
  for (const item of value.workspaces) {
    if (
      !record(item) ||
      !text(item.id) ||
      !text(item.name) ||
      !item.name.trim() ||
      workspaces.has(item.id)
    )
      throw new Error("Saved workspace data is invalid.");
    workspaces.add(item.id);
  }
  const nodes = new Map<string, Record<string, unknown>>();
  for (const item of value.nodes) {
    if (
      !record(item) ||
      !text(item.id) ||
      !text(item.name) ||
      !text(item.workspaceId) ||
      !workspaces.has(item.workspaceId) ||
      !(item.parentId === null || text(item.parentId)) ||
      !(item.kind === "folder" || item.kind === "file") ||
      !date(item.updatedAt) ||
      (item.content !== undefined && !text(item.content)) ||
      (item.mimeType !== undefined && !text(item.mimeType)) ||
      (item.size !== undefined &&
        (typeof item.size !== "number" || item.size < 0)) ||
      nodes.has(item.id)
    )
      throw new Error("Saved file data is invalid.");
    if (
      item.versions !== undefined &&
      (!Array.isArray(item.versions) ||
        item.versions.some(
          (version) =>
            !record(version) ||
            !text(version.id) ||
            !text(version.content) ||
            typeof version.size !== "number" ||
            !Number.isFinite(version.size) ||
            version.size < 0 ||
            !date(version.createdAt),
        ))
    )
      throw new Error("Saved file versions are invalid.");
    if (item.sourceUrl !== undefined) {
      if (
        !text(item.sourceUrl) ||
        item.kind !== "file" ||
        item.content !== undefined
      )
        throw new Error("Saved link is invalid.");
      parseLink(item.sourceUrl);
    }
    if (
      item.comments !== undefined &&
      (!Array.isArray(item.comments) ||
        item.comments.some(
          (comment) =>
            !record(comment) ||
            !text(comment.id) ||
            !text(comment.text) ||
            !date(comment.createdAt),
        ))
    )
      throw new Error("Saved file comments are invalid.");
    nodes.set(item.id, item);
  }
  for (const item of nodes.values()) {
    const seen = new Set([item.id]);
    let parentId = item.parentId;
    while (parentId !== null) {
      const parent = nodes.get(parentId as string);
      if (
        !parent ||
        parent.kind !== "folder" ||
        parent.workspaceId !== item.workspaceId ||
        seen.has(parentId)
      )
        throw new Error("Saved folder path is invalid.");
      seen.add(parentId);
      parentId = parent.parentId;
    }
  }
  const conversations = new Set<string>();
  for (const item of value.conversations) {
    if (
      !record(item) ||
      !text(item.id) ||
      !text(item.workspaceId) ||
      !workspaces.has(item.workspaceId) ||
      !text(item.title) ||
      !text(item.draft) ||
      !Array.isArray(item.messages) ||
      conversations.has(item.id)
    )
      throw new Error("Saved conversation data is invalid.");
    if (
      item.threadDrafts !== undefined &&
      (!record(item.threadDrafts) ||
        Object.values(item.threadDrafts).some((value) => !text(value)))
    )
      throw new Error("Saved thread drafts are invalid.");
    conversations.add(item.id);
    const messages = new Set<string>();
    for (const message of item.messages) {
      if (
        !record(message) ||
        !text(message.id) ||
        !text(message.text) ||
        !date(message.createdAt) ||
        (message.referenceId !== undefined &&
          (!text(message.referenceId) ||
            (nodes.has(message.referenceId)
              ? nodes.get(message.referenceId)?.workspaceId !== item.workspaceId
              : !text(message.referenceName) ||
                !message.referenceName.trim() ||
                (message.referenceKind !== "file" &&
                  message.referenceKind !== "folder")))) ||
        (message.referenceName !== undefined &&
          (!text(message.referenceName) ||
            !message.referenceName.trim() ||
            message.referenceId === undefined)) ||
        (message.referenceKind !== undefined &&
          ((message.referenceKind !== "file" &&
            message.referenceKind !== "folder") ||
            message.referenceId === undefined)) ||
        messages.has(message.id)
      )
        throw new Error("Saved message data is invalid.");
      messages.add(message.id);
    }
    for (const message of item.messages) {
      if (
        message.replyToId !== undefined &&
        (!text(message.replyToId) ||
          message.replyToId === message.id ||
          !item.messages.some(
            (parent) =>
              parent.id === message.replyToId && parent.replyToId === undefined,
          ))
      )
        throw new Error("Saved message thread is invalid.");
    }
    const roots = new Set(
      item.messages
        .filter((message) => message.replyToId === undefined)
        .map((message) => message.id),
    );
    if (
      record(item.threadDrafts) &&
      Object.keys(item.threadDrafts).some((id) => !roots.has(id))
    )
      throw new Error("Saved thread draft parent is invalid.");
  }
  return value as unknown as RoomData;
}

export function readData(key = storageKey): RoomData {
  const raw = localStorage.getItem(key);
  return raw === null ? emptyData : parseData(raw);
}

export function folderPath(data: RoomData, folderId: string | null) {
  const path = [];
  const visited = new Set<string>();
  let id = folderId;
  while (id !== null) {
    if (visited.has(id)) throw new Error("Invalid folder hierarchy.");
    visited.add(id);
    const node = data.nodes.find((item) => item.id === id);
    if (!node || node.kind !== "folder")
      throw new Error("Folder parent is unavailable.");
    path.unshift(node);
    id = node.parentId;
  }
  return path;
}

export function directory(nodes: RoomData["nodes"], parentId: string | null) {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      const first = a.name.toLowerCase();
      const second = b.name.toLowerCase();
      return first < second ? -1 : first > second ? 1 : 0;
    });
}

export function clearAccountData(
  storage: Pick<Storage, "key" | "length" | "removeItem">,
  userId: string,
) {
  if (!userId) throw new Error("Account identity is missing.");
  const scope = `${storageKey}.account.${userId}`;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (
      key === scope ||
      key?.startsWith(`${scope}.`) ||
      key === `screeningroom.appearance.${userId}`
    )
      keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
