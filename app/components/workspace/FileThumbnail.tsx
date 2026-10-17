import type { FileNode } from "../../lib/types";
import { useThumbnail } from "../../state/useThumbnail";
import LoadingIndicator from "../controls/LoadingIndicator";
import styles from "./FileThumbnail.module.css";

export default function FileThumbnail({ node, onOpen }: { node: FileNode; onOpen: () => void }) {
  const thumbnail = useThumbnail(node);
  return <div className={styles.thumbnail}>
    {thumbnail.url ? <button className={styles.open} aria-label={`Preview ${node.name}`} onClick={onOpen}>
      <img src={thumbnail.url} alt={node.name} onError={thumbnail.fail} />
    </button> : !thumbnail.error && <LoadingIndicator label="Loading thumbnail" />}
    {thumbnail.error && <div className={styles.error} role="alert">
      <span>{thumbnail.error}</span><button onClick={thumbnail.retry}>Retry</button>
    </div>}
  </div>;
}
