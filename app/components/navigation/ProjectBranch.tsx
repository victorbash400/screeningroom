import {
  ChevronRight,
  Ellipsis,
  FolderClosed,
  FolderOpen,
  SquarePen,
} from "lucide-react";
import type { FileNode } from "../../lib/types";
import type { BranchProps } from "./WorkspaceBranch";
import { directory, folderPath } from "../../lib/storage";
import { fileIcon } from "../../lib/fileTypes";
import IconButton from "../controls/IconButton";
import { useNodeDrag } from "../../state/useNodeDrag";
import styles from "./WorkspaceBranch.module.css";
export default function ProjectBranch({
  node,
  depth,
  ...props
}: BranchProps & { node: FileNode; depth: number }) {
  const {
    expanded,
    location,
    nodes,
    onToggle,
    onNavigate,
    onName,
    onOpenNode,
    onMenu,
    selectedId,
  } = props;
  const drag = useNodeDrag(
    node.workspaceId,
    node.kind === "folder" ? node.id : node.parentId,
    node,
  );
  const folder = node.kind === "folder";
  const open = folder && expanded.has(node.id);
  const selected = folder
    ? location.folderId === node.id
    : selectedId === node.id;
  const inPath =
    location.folderId !== null &&
    nodes.some(
      (item) => item.id === location.folderId && item.kind === "folder",
    ) &&
    folderPath(
      { version: 1, nodes, workspaces: [], conversations: [] },
      location.folderId,
    ).some((item) => item.id === node.id);
  const Icon = !folder ? fileIcon(node.name, node.sourceUrl, node.mimeType) : inPath ? FolderOpen : FolderClosed;
  const children = folder ? directory(nodes, node.id) : [];
  return (
    <div>
      <div
        {...drag}
        className={`${styles.row} ${styles.nested} ${selected ? styles.selected : ""}`}
        style={{ marginLeft: depth * 20 }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMenu(
            event.clientX,
            event.clientY,
            node.workspaceId,
            node.parentId,
            node,
          );
        }}
      >
        {children.length > 0 ? (
          <button
            className={`${styles.toggle} ${open ? styles.expanded : ""}`}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
            aria-expanded={open}
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight size={14} />
          </button>
        ) : (
          <span className={styles.toggle} aria-hidden="true" />
        )}
        <button
          className={styles.label}
          aria-current={selected ? "page" : undefined}
          onClick={() => {
            if (folder) {
              onNavigate(node.workspaceId, node.id);
              if (!open) onToggle(node.id);
            } else onOpenNode(node);
          }}
        >
          <Icon size={24} strokeWidth={1.7} />
          <span>{node.name}</span>
        </button>
        <div className={styles.actions}>
          {folder && (
            <IconButton
              className={styles.folderMenu}
              label={`${node.name} actions`}
              aria-haspopup="menu"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                onMenu(rect.left, rect.bottom, node.workspaceId, node.id, node);
              }}
            >
              <Ellipsis />
            </IconButton>
          )}

          <IconButton
            label={`Rename ${node.name}`}
            onClick={() =>
              onName({
                kind: "rename",
                target: "node",
                id: node.id,
                name: node.name,
              })
            }
          >
            <SquarePen />
          </IconButton>
        </div>
      </div>
      {open &&
        children.map((child) => (
          <ProjectBranch
            key={child.id}
            node={child}
            depth={depth + 1}
            {...props}
          />
        ))}
    </div>
  );
}
