"use client";
import { useEffect, useState } from "react";
import type { NameAction, FileNode, ViewMode } from "../lib/types";
import { pickedEntries, readDroppedItems, type ImportProgress } from "../lib/importFiles";
import { useAccount } from "./AccountContext";
import { warmAsset } from "../lib/assetCache";
import { readFileBlob } from "../lib/cloudFiles";
import { folderPath } from "../lib/storage";
import { useRoomStore } from "./RoomDataContext";
import { useRoomNavigation } from "./useRoomNavigation";
import { useRoomActions } from "./useRoomActions";
import { useDeletedLocation } from "./useDeletedLocation";
import { useLocalChat } from "./useLocalChat";

export function useScreeningroom() {
  const room = useRoomStore();
  const account = useAccount();
  const navigation = useRoomNavigation(room.data);
  const actions = useRoomActions(room.update, room.setError, room.save);
  const { location } = navigation;
  const workspace = room.data.workspaces.find(
    (item) => item.id === location.workspaceId,
  );
  const path = room.data.nodes.some(
    (node) => node.id === location.folderId && node.kind === "folder",
  )
    ? folderPath(room.data, location.folderId)
    : [];
  useDeletedLocation(
    room.data,
    room.ready,
    location,
    path,
    navigation.navigate,
  );
  const { reveal } = navigation;
  useEffect(() => {
    if (location.workspaceId)
      reveal([location.workspaceId, ...path.map((node) => node.id)]);
  }, [location.workspaceId, location.folderId, room.data.nodes, reveal]);
  const invalidLocation =
    room.ready &&
    ((location.workspaceId !== null && !workspace) ||
      (location.folderId !== null &&
        (!path.length ||
          path.at(-1)?.workspaceId !== location.workspaceId ||
          path.at(-1)?.kind !== "folder")));
  const nodes = room.data.nodes.filter(
    (node) => node.workspaceId === workspace?.id,
  );
  const children = nodes.filter((node) => node.parentId === location.folderId);
  const [mode, setMode] = useState<ViewMode>("list");
  const [nameAction, setNameAction] = useState<NameAction | null>(null);
  const [deleting, setDeleting] = useState<{
    target: "workspace" | "node" | "conversation";
    id: string;
    name: string;
  } | null>(null);
  const { selection, setSelection } = navigation;
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    workspaceId: string;
    parentId: string | null;
    node?: FileNode;
    workspaceRoot?: boolean;
  } | null>(null);
  const [previewing, setPreviewing] = useState<FileNode | null>(null);
  const [sharing, setSharing] = useState<FileNode | null>(null);
  const [moving, setMoving] = useState<FileNode | null>(null);
  const [editing, setEditing] = useState<{
    node: FileNode;
    text: string;
  } | null>(null);
  const [importDestination, setImportDestination] = useState<{
    workspaceId: string;
    parentId: string | null;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const chat = useLocalChat(room.data, workspace?.id ?? null, room.update);
  const selected = nodes.find((node) => node.id === selection);
  useEffect(() => {
    if (account.user && selected?.content) void warmAsset(account.user.id, selected.content);
  }, [account.user?.id, selected?.content]);
  function navigate(
    workspaceId: string | null,
    folderId: string | null = null,
  ) {
    navigation.navigate(workspaceId, folderId);
    for (const node of folderPath(room.data, folderId))
      if (!navigation.expanded.has(node.id)) navigation.toggle(node.id);
  }
  function selectNode(node: FileNode) {
    if (node.kind === "folder") navigate(node.workspaceId, node.id);
    else {
      navigation.navigate(node.workspaceId, node.parentId, node.id);
      chat.close();
    }
  }
  function openNode(node: FileNode) {
    selectNode(node);
    if (node.kind === "file") setPreviewing(node);
  }
  function showName(action: NameAction) {
    room.setError(null);
    setNameAction(action);
  }
  function submitName(action: NameAction, name: string) {
    return actions.submitName(action, name, (id) => {
      if (action.kind === "workspace") navigate(id);
      else if (action.kind === "folder" || action.kind === "file")
        navigation.navigate(action.workspaceId, action.parentId, id);
    });
  }
  function askDelete(
    target: "workspace" | "node" | "conversation",
    id: string,
  ) {
    const collection =
      target === "workspace"
        ? room.data.workspaces
        : target === "node"
          ? room.data.nodes
          : room.data.conversations;
    const item = collection.find((item) => item.id === id);
    if (item) {
      room.setError(null);
      setDeleting({
        target,
        id,
        name: "name" in item ? item.name : item.title,
      });
    }
  }
  function remove() {
    if (!deleting) return false;
    if (!actions.remove(deleting.target, deleting.id)) return false;
    if (deleting.target === "workspace" && location.workspaceId === deleting.id)
      navigate(null);
    if (
      deleting.target === "node" &&
      path.some((node) => node.id === deleting.id)
    )
      navigate(
        location.workspaceId,
        path[path.findIndex((node) => node.id === deleting.id) - 1]?.id ?? null,
      );
    if (deleting.target === "node" && selection === deleting.id)
      setSelection(null);
    if (
      deleting.target === "conversation" &&
      chat.conversation?.id === deleting.id
    )
      chat.close();
    return true;
  }
  function showMenu(
    x: number,
    y: number,
    workspaceId: string,
    parentId: string | null,
    node?: FileNode,
    workspaceRoot = false,
  ) {
    if (
      node &&
      workspaceId === location.workspaceId &&
      node.parentId === location.folderId
    )
      setSelection(node.id);
    setMenu({ x, y, workspaceId, parentId, node, workspaceRoot });
  }
  async function editFile(node: FileNode) {
    try {
      if (!node.content) throw new Error("File content is unavailable.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await (await readFileBlob(node.content, account.user?.id)).arrayBuffer(),
      );
      setEditing({ node, text });
      room.setError(null);
    } catch (failure) {
      room.setError(
        failure instanceof Error ? failure.message : "Cannot open text file.",
      );
    }
  }
  function requestImport(workspaceId: string, parentId: string | null) {
    room.setError(null);
    setImportDestination({ workspaceId, parentId });
  }
  async function importFromMenu(source: { files: FileList; folder: boolean } | { items: DataTransferItemList }) {
    if (!importDestination || importing) return false;
    setImportProgress(null);
    setImporting(true);
    try {
      return await actions.importEntries(
        "items" in source ? await readDroppedItems(source.items) : pickedEntries(source.files, source.folder),
        importDestination.workspaceId,
        importDestination.parentId,
        setImportProgress,
      );
    } catch (failure) {
      room.setError(
        failure instanceof Error ? failure.message : "Import failed.",
      );
      return false;
    } finally {
      setImporting(false);
    }
  }
  function share(node: FileNode) {
    room.setError(null);
    navigate(node.workspaceId, node.parentId);
    setSharing(node);
  }
  function createFolder() {
    if (workspace)
      showName({
        kind: "folder",
        workspaceId: workspace.id,
        parentId: location.folderId,
      });
  }
  return {
    menu,
    setMenu,
    showMenu,
    moving,
    setMoving,
    sharing,
    setSharing,
    previewing,
    setPreviewing,
    editing,
    setEditing,
    editFile,
    importDestination,
    closeImport: () => setImportDestination(null),
    importLink: (url: string, name: string) =>
      importDestination
        ? actions.importLink(
            url,
            name,
            importDestination.workspaceId,
            importDestination.parentId,
          )
        : false,
    requestImport,
    importFromMenu,
    share,
    room,
    invalidLocation,
    navigation,
    actions,
    workspace,
    path,
    nodes,
    children,
    mode,
    setMode,
    nameAction,
    setNameAction,
    showName,
    submitName,
    deleting,
    setDeleting,
    askDelete,
    remove,
    selected,
    setSelection,
    importing,
    importProgress,
    chat,
    navigate,
    openNode,
    selectNode,
    createFolder,
  };
}
