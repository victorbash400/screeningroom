import type { FileNode } from "../../lib/types";
import { fileIcon, fileSize } from "../../lib/fileTypes";
import styles from "./FileInformation.module.css";
export default function FileInformation({ node }: { node: FileNode }) {
  const Icon = fileIcon(node.name, node.sourceUrl, node.mimeType);
  const date = new Date(node.updatedAt);
  return (
    <div className={styles.information}>
      <div className={styles.icon}>
        <Icon size={72} strokeWidth={1.5} />
      </div>
      <div className={styles.name}>{node.name}</div>
      <div className={styles.size}>{node.sourceUrl ? "Link" : fileSize(node.size ?? 0)}</div>
      <div className={styles.modified}>
        <span>Modified</span>
        <time dateTime={node.updatedAt}>
          {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
        </time>
      </div>
    </div>
  );
}
