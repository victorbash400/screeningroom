import { useState } from "react";
import type { HTMLAttributes } from "react";
import { folderPath } from "../../lib/storage";
import { readDroppedItems } from "../../lib/importFiles";
import { useRoomStore } from "../../state/RoomDataContext";
import { useRoomActions } from "../../state/useRoomActions";
import { useNodeDrag } from "../../state/useNodeDrag";
import { useScrollEdges } from "../../state/useScrollEdges";
import edges from "../controls/ScrollEdges.module.css";
import styles from "./DirectoryDropSurface.module.css";
export default function DirectoryDropSurface({
  workspaceId,
  parentId,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  workspaceId: string;
  parentId: string | null;
}) {
  const scroll = useScrollEdges<HTMLDivElement>();
  const room = useRoomStore();
  const actions = useRoomActions(room.update, room.setError, room.scope);
  const drag = useNodeDrag(workspaceId, parentId);
  const [external, setExternal] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div
      {...props}
      {...drag}
      ref={scroll}
      className={`${styles.surface} ${edges.edges} ${className}`}
      aria-busy={busy}
      data-external-drag={external || undefined}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) {
            event.dataTransfer.dropEffect = "copy";
            setExternal(true);
          }
        } else drag.onDragOver(event);
      }}
      onDragLeave={(event) => {
        drag.onDragLeave(event);
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setExternal(false);
      }}
      onDrop={async (event) => {
        setExternal(false);
        if (!event.dataTransfer.types.includes("Files")) {
          drag.onDrop(event);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
          const entries = await readDroppedItems(event.dataTransfer.items);
          const workspace = room.data.workspaces.find(
            (item) => item.id === workspaceId,
          );
          if (!workspace) throw new Error("Workspace no longer exists.");
          room.confirmDrop({
            kind: "import",
            names: entries.map((entry) =>
              entry.kind === "folder" ? entry.name : entry.file.name,
            ),
            destination: [
              workspace.name,
              ...folderPath(room.data, parentId).map((item) => item.name),
            ],
            run: () => actions.importEntries(entries, workspaceId, parentId),
          });
        } catch (failure) {
          room.setError(
            failure instanceof Error ? failure.message : "Import failed.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </div>
  );
}
