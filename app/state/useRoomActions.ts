import { removeRoomItem } from "../lib/removeRoomItem";
import { parseLink, linkName } from "../lib/linkFiles";
import { uploadCloudFile } from "../lib/cloudFiles";
import type { Dispatch, SetStateAction } from "react";
import { prepareImport, type ImportProgress } from "../lib/importFiles";
import type { ImportEntry } from "../lib/importFiles";
import type { NameAction, RoomData } from "../lib/types";
type Update = (change: (data: RoomData) => RoomData) => boolean;
export function useRoomActions(
  update: Update,
  reportError: Dispatch<SetStateAction<string | null>>,
  save: () => Promise<boolean>,
) {
  function submitName(
    action: NameAction,
    name: string,
    onCreated?: (id: string) => void,
  ) {
    const id = crypto.randomUUID();
    const success = update((data) => {
      if (action.kind === "workspace")
        return {
          ...data,
          workspaces: [...data.workspaces, { id, name }],
        };
      if (action.kind === "folder" || action.kind === "file") {
        if (
          data.nodes.some(
            (node) =>
              node.workspaceId === action.workspaceId &&
              node.parentId === action.parentId &&
              node.name === name,
          )
        )
          throw new Error("This name is already in use.");
        return {
          ...data,
          nodes: [
            ...data.nodes,
            {
              id,
              name,
              kind: action.kind,
              ...(action.kind === "file"
                ? {
                    content: "data:text/plain;charset=utf-8,",
                    mimeType: "text/plain",
                    size: 0,
                  }
                : {}),
              workspaceId: action.workspaceId,
              parentId: action.parentId,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      }
      if (action.target === "workspace")
        return {
          ...data,
          workspaces: data.workspaces.map((item) =>
            item.id === action.id ? { ...item, name } : item,
          ),
        };
      if (action.target === "conversation")
        return {
          ...data,
          conversations: data.conversations.map((item) =>
            item.id === action.id ? { ...item, title: name } : item,
          ),
        };
      const target = data.nodes.find((node) => node.id === action.id);
      if (!target) throw new Error("Item no longer exists.");
      if (
        data.nodes.some(
          (node) =>
            node.id !== target.id &&
            node.workspaceId === target.workspaceId &&
            node.parentId === target.parentId &&
            node.name === name,
        )
      )
        throw new Error("This name is already in use.");
      return {
        ...data,
        nodes: data.nodes.map((item) =>
          item.id === action.id
            ? { ...item, name, updatedAt: new Date().toISOString() }
            : item,
        ),
      };
    });
    if (success && action.kind !== "rename") onCreated?.(id);
    return success;
  }
  function remove(target: "workspace" | "node" | "conversation", id: string) {
    return update((data) => removeRoomItem(data, target, id));
  }
  function importLink(
    value: string,
    title: string,
    workspaceId: string,
    parentId: string | null,
  ) {
    return update((data) => {
      const url = parseLink(value);
      const name = title.trim() || linkName(url);
      if (
        data.nodes.some(
          (node) =>
            node.workspaceId === workspaceId &&
            node.parentId === parentId &&
            node.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        throw new Error("This name is already in use.");
      return {
        ...data,
        nodes: [
          ...data.nodes,
          {
            id: crypto.randomUUID(),
            workspaceId,
            parentId,
            kind: "file",
            name,
            sourceUrl: url.href,
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    });
  }
  async function importEntries(
    entries: ImportEntry[],
    workspaceId: string,
    parentId: string | null,
    onProgress?: (progress: ImportProgress) => void,
  ) {
    try {
      const items = await prepareImport(
        entries,
        workspaceId,
        parentId,
        uploadCloudFile,
        undefined,
        onProgress,
      );
      const success = update((data) => {
        const names = new Set(
          data.nodes
            .filter(
              (node) =>
                node.workspaceId === workspaceId && node.parentId === parentId,
            )
            .map((node) => node.name.toLocaleLowerCase()),
        );
        for (const item of items.filter((item) => item.parentId === parentId)) {
          if (names.has(item.name.toLocaleLowerCase()))
            throw new Error(`${item.name} already exists.`);
          names.add(item.name.toLocaleLowerCase());
        }
        return { ...data, nodes: [...data.nodes, ...items] };
      });
      return success && await save();
    } catch (failure) {
      reportError(
        failure instanceof Error ? failure.message : "Import failed.",
      );
      return false;
    }
  }
  function importFiles(
    files: FileList,
    workspaceId: string,
    parentId: string | null,
  ) {
    return importEntries(
      Array.from(files, (file) => ({ kind: "file", file })),
      workspaceId,
      parentId,
    );
  }
  function move(nodeId: string, parentId: string | null) {
    return update((data) => {
      const node = data.nodes.find((item) => item.id === nodeId);
      if (!node) throw new Error("Item no longer exists.");
      let current = parentId;
      while (current !== null) {
        if (current === nodeId)
          throw new Error("A folder cannot be moved into itself.");
        const parent = data.nodes.find((item) => item.id === current);
        if (
          !parent ||
          parent.kind !== "folder" ||
          parent.workspaceId !== node.workspaceId
        )
          throw new Error("Destination folder is unavailable.");
        current = parent.parentId;
      }
      if (
        data.nodes.some(
          (item) =>
            item.id !== nodeId &&
            item.workspaceId === node.workspaceId &&
            item.parentId === parentId &&
            item.name.toLocaleLowerCase() === node.name.toLocaleLowerCase(),
        )
      )
        throw new Error("This name is already in use.");
      return {
        ...data,
        nodes: data.nodes.map((item) =>
          item.id === nodeId
            ? { ...item, parentId, updatedAt: new Date().toISOString() }
            : item,
        ),
      };
    });
  }
  async function saveText(nodeId: string, text: string) {
    const content = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
    const size = new TextEncoder().encode(text).length;
    const createdAt = new Date().toISOString();
    const success = update((data) => {
      const node = data.nodes.find((item) => item.id === nodeId);
      if (!node || node.kind !== "file")
        throw new Error("File no longer exists.");
      return {
        ...data,
        nodes: data.nodes.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                content,
                mimeType: "text/plain",
                size,
                updatedAt: createdAt,
                versions: [
                  ...(item.versions ??
                    (item.content && (item.size ?? 0) > 0
                      ? [
                          {
                            id: crypto.randomUUID(),
                            content: item.content,
                            size: item.size ?? 0,
                            createdAt: item.updatedAt,
                          },
                        ]
                      : [])),
                  { id: crypto.randomUUID(), content, size, createdAt },
                ],
              }
            : item,
        ),
      };
    });
    return success && await save();
  }
  function comment(nodeId: string, text: string) {
    return update((data) => {
      if (
        !data.nodes.some((node) => node.id === nodeId && node.kind === "file")
      )
        throw new Error("File no longer exists.");
      return {
        ...data,
        nodes: data.nodes.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                comments: [
                  ...(item.comments ?? []),
                  {
                    id: crypto.randomUUID(),
                    text,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : item,
        ),
      };
    });
  }
  return {
    submitName,
    remove,
    importFiles,
    importEntries,
    importLink,
    move,
    saveText,
    comment,
  };
}
