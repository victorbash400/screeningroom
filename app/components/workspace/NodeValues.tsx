import type { FileNode } from "../../lib/types";
import { fileSize } from "../../lib/fileTypes";
import styles from "./NodeValues.module.css";
export default function NodeValues({ node }: { node: FileNode }) {
  const date = new Date(node.updatedAt);
  return (
    <div className={styles.values}>
      <time className={styles.date} dateTime={node.updatedAt}>
        {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
      </time>
      <span className={styles.size}>
        {node.kind === "folder" || node.sourceUrl ? "—" : fileSize(node.size ?? 0)}
      </span>
      <span className={styles.kind}>
        {node.kind === "folder" ? "Folder" : node.sourceUrl ? "Link" : "File"}
      </span>
    </div>
  );
}
