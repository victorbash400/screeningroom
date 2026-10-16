import {
  Ellipsis,
  FolderClosed,
  FolderOpen,
  SquarePen,
} from "lucide-react";
import type { FileNode } from "../../lib/types";
import type { RefObject } from "react";
import { fileIcon } from "../../lib/fileTypes";
import IconButton from "../controls/IconButton";
import NodeValues from "./NodeValues";
import { useAccount } from "../../state/AccountContext";
import { warmAsset } from "../../lib/assetCache";
import { useNodeDrag } from "../../state/useNodeDrag";
import styles from "./NodeTile.module.css";
interface Props {
  node: FileNode;
  clickSequence: RefObject<string | null>;
  grid?: boolean;
  column?: boolean;
  selected?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onMenu: (x: number, y: number) => void;
}
export default function NodeTile({
  node,
  clickSequence,
  grid,
  column,
  selected,
  onSelect,
  onOpen,
  onRename,
  onMenu,
}: Props) {
  const account = useAccount();
  const warm = () => { if (account.user && node.content) void warmAsset(account.user.id, node.content); };
  const drag = useNodeDrag(
    node.workspaceId,
    node.kind === "folder" ? node.id : node.parentId,
    node,
  );
  const Icon =
    node.kind === "file"
      ? fileIcon(node.name, node.sourceUrl, node.mimeType)
      : selected
        ? FolderOpen
        : FolderClosed;
  return (
    <div
      {...drag}
      data-node-id={node.id}
      onPointerEnter={warm}
      onFocus={warm}
      className={`${styles.row} ${grid ? styles.grid : ""} ${column ? styles.column : ""} ${selected ? styles.selected : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMenu(event.clientX, event.clientY);
      }}
    >
      <button
        className={styles.open}
        aria-pressed={selected}
        onClick={(event) => {
          if (event.detail <= 1) clickSequence.current = node.id;
          if (clickSequence.current === node.id) onSelect();
        }}
        onDoubleClick={
          column && node.kind === "folder"
            ? undefined
            : () => {
                if (clickSequence.current === node.id) onOpen();
              }
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            event.stopPropagation();
            onRename();
          }
        }}
      >
        <Icon size={grid ? 56 : 24} strokeWidth={1.7} />
        <span>{node.name}</span>
        {!grid && !column && <NodeValues node={node} />}
      </button>
      {!grid && !column && (
        <div className={styles.menu}>
          <IconButton
            label={`${node.name} actions`}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onMenu(rect.left, rect.bottom);
            }}
          >
            <Ellipsis />
          </IconButton>
        </div>
      )}
      <div className={styles.rename}>
        <IconButton label={`Rename ${node.name}`} onClick={onRename}>
          <SquarePen />
        </IconButton>
      </div>
    </div>
  );
}
