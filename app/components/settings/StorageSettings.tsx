import { useRoomStore } from "../../state/RoomDataContext";
import { fileSize } from "../../lib/fileTypes";
import SettingsGroup from "./SettingsGroup";
import SettingsRow from "./SettingsRow";
export default function StorageSettings() {
  const { data } = useRoomStore();
  const files = data.nodes.filter((node) => node.kind === "file");
  return (
    <SettingsGroup>
      <SettingsRow label="Files in your workspaces">
        <span>
          {fileSize(files.reduce((sum, file) => sum + (file.size ?? 0), 0))}
        </span>
      </SettingsRow>
      {data.workspaces.map((workspace) => {
        const items = files.filter((file) => file.workspaceId === workspace.id);
        return (
          <SettingsRow key={workspace.id} label={workspace.name}>
            <span>
              {fileSize(items.reduce((sum, file) => sum + (file.size ?? 0), 0))}{" "}
              · {items.length} {items.length === 1 ? "file" : "files"}
            </span>
          </SettingsRow>
        );
      })}
    </SettingsGroup>
  );
}
