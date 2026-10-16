import { memo } from "react";
import Markdown from "react-markdown";
import styles from "./MessageText.module.css";

function MessageText({ text }: { text: string }) {
  return <div className={styles.text}><Markdown>{text}</Markdown></div>;
}

export default memo(MessageText);
