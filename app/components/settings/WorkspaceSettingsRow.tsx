import { ChevronDown, ChevronRight, FolderClosed, FolderOpen } from "lucide-react";
import type { Workspace } from "../../lib/types";
import styles from "./WorkspaceSettingsRow.module.css";
export default function WorkspaceSettingsRow({
  workspace,
  selected,
  onSelect,
}: {
  workspace: Workspace;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = selected ? FolderOpen : FolderClosed;
  const Chevron = selected ? ChevronDown : ChevronRight;
  return (
    <button className={styles.row} aria-expanded={selected} onClick={onSelect}>
      <Icon size={24} strokeWidth={1.7} />
      <span className={styles.name}>
        {workspace.name}
        <span>Local</span>
      </span>
      <Chevron size={16} />
    </button>
  );
}
