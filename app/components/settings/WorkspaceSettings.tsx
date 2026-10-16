import ErrorNotice from "../shell/ErrorNotice";
import { useState } from "react";
import { useRoomStore } from "../../state/RoomDataContext";
import { useRoomActions } from "../../state/useRoomActions";
import SettingsGroup from "./SettingsGroup";
import SettingsInlineButton from "./SettingsInlineButton";
import WorkspaceSettingsSection from "./WorkspaceSettingsSection";
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
  const selected = room.data.workspaces.find((workspace) => workspace.id === selectedId);
  const missing = (dialog === "rename" || dialog === "delete") && !selected;
  function open(next: typeof dialog, id?: string) {
    room.setError(null);
    if (id) setSelectedId(id);
    setDialog(next);
  }
  return (
    <div className={styles.settings}>
      {room.data.workspaces.length > 0 && (
        <SettingsGroup>
          {room.data.workspaces.map((workspace) => (
            <WorkspaceSettingsSection
              key={workspace.id}
              workspace={workspace}
              nodes={room.data.nodes.filter((node) => node.workspaceId === workspace.id)}
              onRename={() => open("rename", workspace.id)}
              onDelete={() => open("delete", workspace.id)}
            />
          ))}
        </SettingsGroup>
      )}
      <div className={styles.actions}>
        <SettingsInlineButton onClick={() => open("create")}>
          Create workspace
        </SettingsInlineButton>
        {room.hasLegacy && <SettingsInlineButton onClick={() => { void room.importBrowserData(); }}>
          Import browser data
        </SettingsInlineButton>}
      </div>
      {room.error && !dialog && <ErrorNotice message={room.error} onDismiss={() => room.setError(null)} />}
      {missing && <ErrorNotice message="Workspace no longer exists." onDismiss={() => setDialog(null)} />}
      {(dialog === "create" || (dialog === "rename" && selected)) && (
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
