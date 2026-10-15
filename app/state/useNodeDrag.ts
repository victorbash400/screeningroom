import { useState } from "react";
import type { DragEvent } from "react";
import type { FileNode } from "../lib/types";
import { useRoomStore } from "./RoomDataContext";
import { useRoomActions } from "./useRoomActions";
export function useNodeDrag(
  workspaceId: string,
  destination: string | null,
  node?: FileNode,
) {
  const room = useRoomStore();
  const actions = useRoomActions(room.update, room.setError, room.scope);
  const [over, setOver] = useState(false);
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
    onDrop(event: DragEvent<HTMLElement>) {
      setOver(false);
      if (!accepts()) return;
      event.preventDefault();
      event.stopPropagation();
      const id = room.dragging.current;
      room.dragging.current = null;
      if (id) actions.move(id, destination);
    },
  };
}
