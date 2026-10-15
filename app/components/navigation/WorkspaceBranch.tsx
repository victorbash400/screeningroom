import { Ellipsis, FolderClosed, FolderOpen, ChevronRight, Plus } from "lucide-react";
import type {
  Workspace,
  FileNode,
  Location,
  NameAction,
} from "../../lib/types";
import IconButton from "../controls/IconButton";
import { directory } from "../../lib/storage";
import ProjectBranch from "./ProjectBranch";
import { useNodeDrag } from "../../state/useNodeDrag";
import styles from "./WorkspaceBranch.module.css";
export interface BranchProps {
  selectedId?: string;
  onOpenNode: (node: FileNode) => void;
  onMenu: (
    x: number,
    y: number,
    workspaceId: string,
    parentId: string | null,
    node?: FileNode,
    workspaceRoot?: boolean,
  ) => void;
  nodes: FileNode[];
  location: Location;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (workspaceId: string, folderId?: string | null) => void;
  onName: (action: NameAction) => void;
  onDelete: (target: "workspace" | "node", id: string) => void;
}
export default function WorkspaceBranch({
  workspace,
  ...props
}: BranchProps & { workspace: Workspace }) {
  const {
    location,
    expanded,
    onToggle,
    onNavigate,
    onName,
    onDelete,
    nodes,
    onMenu,
  } = props;
  const drag = useNodeDrag(workspace.id, null);
  const open = expanded.has(workspace.id);
  const selected = location.workspaceId === workspace.id && !location.folderId;
  const Icon = location.workspaceId === workspace.id ? FolderOpen : FolderClosed;
  return (
    <div>
      <div
        {...drag}
        className={`${styles.row} ${selected ? styles.selected : ""}`}
        onContextMenu={(event) => {
          event.preventDefault();
          onMenu(
            event.clientX,
            event.clientY,
            workspace.id,
            null,
            undefined,
            true,
          );
        }}
      >
        <button
          className={`${styles.toggle} ${open ? styles.expanded : ""}`}
          aria-label={`${open ? "Collapse" : "Expand"} ${workspace.name}`}
          aria-expanded={open}
          onClick={() => onToggle(workspace.id)}
        >
          <ChevronRight size={14} />
        </button>
        <button
          className={styles.label}
          onClick={() => onNavigate(workspace.id)}
          aria-current={selected ? "page" : undefined}
        >
          <Icon size={24} strokeWidth={1.7} />
          <span>{workspace.name}</span>
        </button>
        <div className={styles.actions}>
          <IconButton
            label={`New item in ${workspace.name}`}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onMenu(rect.left, rect.bottom, workspace.id, null);
            }}
          >
            <Plus />
          </IconButton>
          <IconButton
            label={`${workspace.name} actions`}
            aria-haspopup="menu"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onMenu(
                rect.left,
                rect.bottom,
                workspace.id,
                null,
                undefined,
                true,
              );
            }}
          >
            <Ellipsis />
          </IconButton>
        </div>
      </div>
      {open &&
        directory(nodes, null).map((node) => (
          <ProjectBranch key={node.id} node={node} depth={1} {...props} />
        ))}
    </div>
  );
}
