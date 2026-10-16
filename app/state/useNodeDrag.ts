import { useState } from "react";
import type { DragEvent } from "react";
import type { FileNode } from "../lib/types";
import { useRoomStore } from "./RoomDataContext";
import { readDroppedItems } from "../lib/importFiles";
import { folderPath } from "../lib/storage";
import { useRoomActions } from "./useRoomActions";
export function useNodeDrag(
  workspaceId: string,
  destination: string | null,
  node?: FileNode,
) {
  const room = useRoomStore();
  const actions = useRoomActions(room.update, room.setError, room.scope);
  const [over, setOver] = useState(false);
  const externalTarget = !node || node.kind === "folder";
  function destinationPath() {
    const workspace = room.data.workspaces.find(
      (item) => item.id === workspaceId,
    );
    if (!workspace) throw new Error("Workspace no longer exists.");
    return [
      workspace.name,
      ...folderPath(room.data, destination).map((item) => item.name),
    ];
  }
  function accepts() {
    const dragged = room.data.nodes.find(
      (item) => item.id === room.dragging.current,
    );
    if (
      !dragged ||
      dragged.workspaceId !== workspaceId ||
      dragged.id === destination ||
      dragged.parentId === destination
    )
      return false;
    let parentId = destination;
    while (parentId !== null) {
      if (parentId === dragged.id) return false;
      const parent = room.data.nodes.find((item) => item.id === parentId);
      if (!parent || parent.kind !== "folder") return false;
      parentId = parent.parentId;
    }
    return true;
  }
  return {
    draggable: Boolean(node),
    "data-drag-over": over || undefined,
    onDragStart(event: DragEvent<HTMLElement>) {
      if (!node) return;
      event.stopPropagation();
      room.dragging.current = node.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-screeningroom-node", node.id);
    },
    onDragEnd() {
      room.dragging.current = null;
      setOver(false);
    },
    onDragOver(event: DragEvent<HTMLElement>) {
      if (externalTarget && event.dataTransfer.types.includes("Files")) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        setOver(true);
        return;
      }
      if (!accepts()) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setOver(true);
    },
    onDragLeave(event: DragEvent<HTMLElement>) {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setOver(false);
    },
    async onDrop(event: DragEvent<HTMLElement>) {
      setOver(false);
      if (externalTarget && event.dataTransfer.types.includes("Files")) {
        event.preventDefault();
        event.stopPropagation();
        try {
          const entries = await readDroppedItems(event.dataTransfer.items);
          room.confirmDrop({
            kind: "import",
            names: entries.map((entry) =>
              entry.kind === "folder" ? entry.name : entry.file.name,
            ),
            destination: destinationPath(),
            run: () => actions.importEntries(entries, workspaceId, destination),
          });
        } catch (failure) {
          room.setError(
            failure instanceof Error ? failure.message : "Import failed.",
          );
        }
        return;
      }
      if (!accepts()) return;
      event.preventDefault();
      event.stopPropagation();
      const id = room.dragging.current;
      room.dragging.current = null;
      if (id) {
        const dragged = room.data.nodes.find((item) => item.id === id);
        if (!dragged) return;
        room.confirmDrop({
          kind: "move",
          names: [dragged.name],
          destination: destinationPath(),
          run: () => actions.move(id, destination),
        });
      }
    },
  };
}
