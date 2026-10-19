import { PanelLeft, Plus, RefreshCw, Info } from "lucide-react";
import type { Workspace } from "../../lib/types";
import PillButton from "../controls/PillButton";
import IconButton from "../controls/IconButton";
import WorkspaceRow from "./WorkspaceRow";
import styles from "./WorkspaceHome.module.css";
export default function WorkspaceHome({
  workspaces,
  ready,
  onCreate,
  onOpen,
  onNavigation,
  onRefresh,
  onInfo,
}: {
  workspaces: Workspace[];
  ready: boolean;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onNavigation: () => void;
  onRefresh: () => void;
  onInfo?: () => void;
}) {
  return (
    <main className={styles.home} aria-label="Workspaces" aria-busy={!ready}>
      <div className={styles.toolbar}>
        <div className={styles.mobile}>
          <IconButton label="Open navigation" onClick={onNavigation}>
            <PanelLeft />
          </IconButton>
        </div>
        <PillButton aria-label="Create workspace" disabled={!ready} onClick={onCreate}>
          <Plus />
          Create workspace
        </PillButton>
        <IconButton
          className={styles.refresh}
          label="Refresh workspaces"
          onClick={onRefresh}
        >
          <RefreshCw />
        </IconButton>
        {onInfo && <IconButton label="Info" onClick={onInfo}><Info /></IconButton>}
      </div>
      <div className={styles.list}>
        {workspaces.map((workspace) => (
          <WorkspaceRow
            key={workspace.id}
            workspace={workspace}
            onOpen={() => onOpen(workspace.id)}
          />
        ))}
      </div>
    </main>
  );
}
