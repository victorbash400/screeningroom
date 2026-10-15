import {
  Download,
  MessageCircle,
  FilePlus,
  FolderPlus,
  FolderInput,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import type { FileNode } from "../../lib/types";
import { isTextFile } from "../../lib/fileTypes";
import styles from "./FileContextMenu.module.css";
import ContextMenu, { type MenuEntry } from "../controls/ContextMenu";
interface Props {
  x: number;
  y: number;
  node?: FileNode;
  onClose: () => void;
  onCreate: (kind: "folder" | "file") => void;
  onImport: () => void;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onExport: () => void;
  onShare: () => void;
  onChat: () => void;
}
export default function FileContextMenu({
  x,
  y,
  node,
  onClose,
  onCreate,
  onImport,
  onOpen,
  onRename,
  onMove,
  onDelete,
  onEdit,
  onExport,
  onShare,
  onChat,
}: Props) {
  const entries: MenuEntry[] = node
    ? [
        { label: "Open", action: onOpen },
        ...(node.kind === "folder"
          ? [
              {
                label: "New folder…",
                action: () => onCreate("folder"),
                icon: FolderPlus,
              },
              {
                label: "New text file…",
                action: () => onCreate("file"),
                icon: FilePlus,
              },
              { label: "Import…", action: onImport, icon: Upload },
            ]
          : []),
        ...(node.kind === "file"
          ? [
              ...(!node.sourceUrl && isTextFile(node.name, node.mimeType)
                ? [{ label: "Edit text", action: onEdit, icon: Pencil }]
                : []),
              ...(!node.sourceUrl
                ? [{ label: "Export…", action: onExport, icon: Download }]
                : []),
            ]
          : []),
        { label: "Chat about this", action: onChat, icon: MessageCircle },
        { label: "Share…", action: onShare, icon: Share2 },
        { label: "Rename…", action: onRename, icon: Pencil },
        { label: "Move…", action: onMove, icon: FolderInput },
        { label: "Delete…", action: onDelete, icon: Trash2, danger: true },
      ]
    : [
        {
          label: "New folder…",
          action: () => onCreate("folder"),
          icon: FolderPlus,
        },
        {
          label: "New text file…",
          action: () => onCreate("file"),
          icon: FilePlus,
        },
        { label: "Import…", action: onImport, icon: Upload },
        { label: "Chat about this", action: onChat, icon: MessageCircle },
      ];
  return (
    <ContextMenu
      className={node ? styles.node : undefined}
      x={x}
      y={y}
      entries={entries}
      onClose={onClose}
    />
  );
}
