import {
  FilePlus,
  FolderPlus,
  MessageCircle,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import ContextMenu from "../controls/ContextMenu";
export default function WorkspaceContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  onCreate,
  onImport,
  onChat,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCreate: (kind: "folder" | "file") => void;
  onImport: () => void;
  onChat: () => void;
}) {
  return (
    <ContextMenu
      x={x}
      y={y}
      onClose={onClose}
      entries={[
        { label: "Rename…", icon: Pencil, action: onRename },
        {
          label: "New folder…",
          icon: FolderPlus,
          action: () => onCreate("folder"),
        },
        {
          label: "New text file…",
          icon: FilePlus,
          action: () => onCreate("file"),
        },
        { label: "Import…", icon: Upload, action: onImport },
        { label: "Chat about this", icon: MessageCircle, action: onChat },
        {
          label: "Delete workspace…",
          icon: Trash2,
          action: onDelete,
          danger: true,
        },
      ]}
    />
  );
}
