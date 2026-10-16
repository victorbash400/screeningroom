import { useId, useState } from "react";
import type { FileNode, Workspace } from "../../lib/types";
import { fileSize } from "../../lib/fileTypes";
import SettingsRow from "./SettingsRow";
import SettingsInlineButton from "./SettingsInlineButton";
import WorkspaceSettingsRow from "./WorkspaceSettingsRow";
import styles from "./WorkspaceSettingsSection.module.css";

export default function WorkspaceSettingsSection({ workspace, nodes, onRename, onDelete }: {
  workspace: Workspace;
  nodes: FileNode[];
  onRename: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const details = useId();
  const files = nodes.filter((node) => node.kind === "file");
  return <section>
    <WorkspaceSettingsRow workspace={workspace} expanded={expanded} controls={details} onToggle={() => setExpanded(!expanded)} />
    <div id={details} hidden={!expanded} className={styles.details}>
      <SettingsRow label="Files"><span>{files.length}</span></SettingsRow>
      <SettingsRow label="Folders"><span>{nodes.length - files.length}</span></SettingsRow>
      <SettingsRow label="Storage"><span>{fileSize(files.reduce((sum, file) => sum + (file.size ?? 0), 0))}</span></SettingsRow>
      <div className={styles.actions}>
        <SettingsInlineButton onClick={onRename}>Rename…</SettingsInlineButton>
        <SettingsInlineButton onClick={onDelete}>Delete…</SettingsInlineButton>
      </div>
    </div>
  </section>;
}
