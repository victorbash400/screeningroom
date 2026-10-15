import {
  ArrowLeft,
  Import,
  MessageCircle,
  PanelLeft,
  Share2,
} from "lucide-react";
import type { FileNode, Workspace, ViewMode } from "../../lib/types";
import IconButton from "../controls/IconButton";
import Breadcrumbs from "./Breadcrumbs";
import ViewSelector from "./ViewSelector";
import styles from "./WorkspaceToolbar.module.css";
interface Props {
  workspace: Workspace;
  path: FileNode[];
  mode: ViewMode;
  chatOpen: boolean;
  importing: boolean;
  onMode: (value: ViewMode) => void;
  onNavigate: (id: string | null, folderId?: string | null) => void;
  onShare: () => void;
  canShare: boolean;
  onChat: () => void;
  onImport: () => void;
  onNavigation: () => void;
}
export default function WorkspaceToolbar({
  workspace,
  path,
  mode,
  chatOpen,
  importing,
  onMode,
  onNavigate,
  onShare,
  canShare,
  onChat,
  onImport,
  onNavigation,
}: Props) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.navigation}>
        <div className={styles.mobile}>
          <IconButton label="Open navigation" onClick={onNavigation}>
            <PanelLeft />
          </IconButton>
        </div>
        <IconButton
          className={styles.back}
          label={path.length ? "Parent folder" : "Back to workspaces"}
          onClick={() =>
            path.length
              ? onNavigate(workspace.id, path.at(-2)?.id ?? null)
              : onNavigate(null)
          }
        >
          <ArrowLeft />
        </IconButton>
        <Breadcrumbs
          workspace={workspace}
          path={path}
          onNavigate={onNavigate}
        />
      </div>
      <div className={styles.actions}>
        <ViewSelector value={mode} onChange={onMode} />
        <div className={`${styles.group} ${styles.actionGroup}`}>
          <IconButton label="Import" disabled={importing} onClick={onImport}>
            <Import />
          </IconButton>
          <IconButton label="Share" disabled={!canShare} onClick={onShare}>
            <Share2 />
          </IconButton>
          <IconButton label="Agent chat" selected={chatOpen} onClick={onChat}>
            <MessageCircle />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
