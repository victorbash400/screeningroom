import type { FileComment } from "../../lib/types";
import styles from "./FileComments.module.css";
export default function FileComments({
  comments,
}: {
  comments: FileComment[];
}) {
  return (
    <div className={styles.list}>
      {comments.map((comment) => (
        <div key={comment.id} className={styles.comment}>
          <span>You</span>
          <div>{comment.text}</div>
        </div>
      ))}
    </div>
  );
}
