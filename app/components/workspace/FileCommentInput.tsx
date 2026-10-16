import { ArrowUp } from "lucide-react";
import { useState } from "react";
import IconButton from "../controls/IconButton";
import styles from "./FileCommentInput.module.css";
export default function FileCommentInput({
  onSubmit,
}: {
  onSubmit: (text: string) => boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim() && onSubmit(text.trim())) setText("");
      }}
    >
      <input
        aria-label="Comment"
        placeholder="Comment"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <IconButton label="Post comment" type="submit" disabled={!text.trim()}>
        <ArrowUp />
      </IconButton>
    </form>
  );
}
