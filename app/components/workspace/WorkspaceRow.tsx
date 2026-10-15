import { FolderClosed } from "lucide-react";
import type { Workspace } from "../../lib/types";
import PillButton from "../controls/PillButton";
import styles from "./WorkspaceRow.module.css";
export default function WorkspaceRow({
  workspace,
  onOpen,
}: {
  workspace: Workspace;
  onOpen: () => void;
}) {
  return (
    <div className={styles.row}>
      <FolderClosed size={30} strokeWidth={1.7} />
      <div className={styles.name}>{workspace.name}</div>
      <PillButton
        secondary
        onClick={onOpen}
        aria-label={`Open ${workspace.name}`}
      >
        Open
      </PillButton>
    </div>
  );
}
