import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MessageText.module.css";

function MessageText({ text }: { text: string }) {
  return <div className={styles.text}><Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown></div>;
}

export default memo(MessageText);
