import ErrorNotice from "../shell/ErrorNotice";
import { useState } from "react";
import { useRoomStore } from "../../state/RoomDataContext";
import { useRoomActions } from "../../state/useRoomActions";
import { fileSize } from "../../lib/fileTypes";
import SettingsGroup from "./SettingsGroup";
import SettingsRow from "./SettingsRow";
import SettingsInlineButton from "./SettingsInlineButton";
import WorkspaceSettingsRow from "./WorkspaceSettingsRow";
import NodeNameDialog from "../controls/NodeNameDialog";
import DeleteDialog from "../controls/DeleteDialog";
import styles from "./WorkspaceSettings.module.css";
export default function WorkspaceSettings() {
  const room = useRoomStore();
  const actions = useRoomActions(room.update, room.setError, room.save);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "rename" | "delete" | null>(
    null,
  );
  const selected =
    room.data.workspaces.find((workspace) => workspace.id === selectedId) ??
    room.data.workspaces[0];
  const nodes = room.data.nodes.filter(
    (node) => node.workspaceId === selected?.id,
  );
  const files = nodes.filter((node) => node.kind === "file");
  function open(next: typeof dialog) {
    room.setError(null);
    setDialog(next);
  }
  return (
    <div className={styles.settings}>
      {room.data.workspaces.length > 0 && (
        <SettingsGroup>
          {room.data.workspaces.map((workspace) => (
            <WorkspaceSettingsRow
              key={workspace.id}
              workspace={workspace}
              selected={selected?.id === workspace.id}
              onSelect={() => setSelectedId(workspace.id)}
            />
          ))}
          {selected && (
            <SettingsRow label="Workspace">
              <SettingsInlineButton onClick={() => open("rename")}>
                Rename…
              </SettingsInlineButton>
              <SettingsInlineButton onClick={() => open("delete")}>
                Delete…
              </SettingsInlineButton>
            </SettingsRow>
          )}
        </SettingsGroup>
      )}
      {selected && (
        <SettingsGroup>
          <SettingsRow label="Local files">
            <span>
              {fileSize(files.reduce((sum, file) => sum + (file.size ?? 0), 0))}
            </span>
          </SettingsRow>
          <SettingsRow label="Files">
            <span>{files.length}</span>
          </SettingsRow>
          <SettingsRow label="Folders">
            <span>{nodes.length - files.length}</span>
          </SettingsRow>
        </SettingsGroup>
      )}
      <div>
        <SettingsInlineButton onClick={() => open("create")}>
          Create workspace
        </SettingsInlineButton>
        {room.hasLegacy && <SettingsInlineButton onClick={() => { void room.importBrowserData(); }}>
          Import browser data
        </SettingsInlineButton>}
      </div>
      {room.error && !dialog && <ErrorNotice message={room.error} onDismiss={() => room.setError(null)} />}
      {(dialog === "rename" || dialog === "create") && (
        <NodeNameDialog
          action={dialog === "rename" ? "Rename" : "Create"}
          initial={dialog === "rename" ? selected?.name : ""}
          error={room.error}
          onClose={() => setDialog(null)}
          onSubmit={(name) =>
            actions.submitName(
              dialog === "rename" && selected
                ? {
                    kind: "rename",
                    target: "workspace",
                    id: selected.id,
                    name: selected.name,
                  }
                : { kind: "workspace" },
              name,
              setSelectedId,
            )
          }
        />
      )}
      {dialog === "delete" && selected && (
        <DeleteDialog
          name={selected.name}
          error={room.error}
          onClose={() => setDialog(null)}
          onDelete={() => actions.remove("workspace", selected.id)}
        />
      )}
    </div>
  );
}
