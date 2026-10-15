import { ChevronRight } from "lucide-react";
import type { FileNode, Workspace } from "../../lib/types";
import styles from "./Breadcrumbs.module.css";
export default function Breadcrumbs({
  workspace,
  path,
  onNavigate,
}: {
  workspace: Workspace;
  path: FileNode[];
  onNavigate: (workspaceId: string | null, folderId?: string | null) => void;
}) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <button onClick={() => onNavigate(null)}>Home</button>
      <ChevronRight size={12} />
      <button
        aria-current={!path.length ? "page" : undefined}
        onClick={() => onNavigate(workspace.id)}
      >
        {workspace.name}
      </button>
      {path.map((node, index) => (
        <span key={node.id}>
          <ChevronRight size={12} />
          <button
            aria-current={index === path.length - 1 ? "page" : undefined}
            onClick={() => onNavigate(workspace.id, node.id)}
          >
            {node.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
