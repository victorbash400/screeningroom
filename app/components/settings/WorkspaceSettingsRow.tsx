import { ChevronDown, ChevronRight, FolderClosed, FolderOpen } from "lucide-react";
import type { Workspace } from "../../lib/types";
import styles from "./WorkspaceSettingsRow.module.css";
export default function WorkspaceSettingsRow({
  workspace,
  expanded,
  controls,
  onToggle,
}: {
  workspace: Workspace;
  expanded: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const Icon = expanded ? FolderOpen : FolderClosed;
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <button className={styles.row} aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
      <Icon size={24} strokeWidth={1.7} />
      <span className={styles.name}>
        {workspace.name}
      </span>
      <Chevron size={16} />
    </button>
  );
}
