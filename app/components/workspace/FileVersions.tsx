import { Download } from "lucide-react";
import type { FileNode } from "../../lib/types";
import { downloadFile, fileSize } from "../../lib/fileTypes";
import IconButton from "../controls/IconButton";
import styles from "./FileVersions.module.css";
import { useAccount } from "../../state/AccountContext";
import { useRoomStore } from "../../state/RoomDataContext";
export default function FileVersions({ node }: { node: FileNode }) {
  const room = useRoomStore();
  const account = useAccount();
  return (
    <div className={styles.versions} role="tabpanel" aria-label="Versions">
      {[...(node.versions ?? [])].reverse().map((version) => (
        <div key={version.id} className={styles.row}>
          <div>
            <time dateTime={version.createdAt}>
              {new Date(version.createdAt).toLocaleString()}
            </time>
            <span>You · {fileSize(version.size)}</span>
          </div>
          <IconButton
            label="Export this version"
            onClick={async () => {
              try {
                await downloadFile(node.name, version.content, account.user?.id);
              } catch (failure) {
                room.setError(
                  failure instanceof Error
                    ? failure.message
                    : "Cannot export version.",
                );
              }
            }}
          >
            <Download />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
