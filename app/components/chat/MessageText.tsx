import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAudienceMap } from "../locations/AudienceMapContext";
import styles from "./MessageText.module.css";

function MessageText({ text }: { text: string }) {
  const map = useAudienceMap();
  return <div className={styles.text}><Markdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => href?.startsWith("#venue:") && map
    ? map.hasVenue(href.slice(7)) ? <a href={href} onClick={(event) => { event.preventDefault(); map.focusVenue(href.slice(7)); }}>{children}</a> : <span>{children}</span>
    : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{text}</Markdown></div>;
}

export default memo(MessageText);
