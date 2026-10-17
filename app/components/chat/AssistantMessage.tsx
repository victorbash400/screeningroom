import type { Message } from "../../lib/types";
import { messageBlocks } from "../../lib/messageBlocks";
import MessageText from "./MessageText";
import ToolCallIndicator from "./ToolCallIndicator";
import ChatLoadingIndicator from "./ChatLoadingIndicator";
import styles from "./AssistantMessage.module.css";
import SimilarResults from "./SimilarResults";

export default function AssistantMessage({ message }: { message: Message }) {
  return <div className={styles.content}>
    {messageBlocks(message).map((block) => block.kind === "tool"
      ? <div key={block.id}><ToolCallIndicator tool={block.tool} status={message.status} />
          {block.tool.state === "done" && block.tool.results && <SimilarResults items={block.tool.results} />}</div>
      : block.text && <MessageText key={block.id} text={block.text} />)}
    {message.status === "streaming" && message.waiting && <ChatLoadingIndicator />}
  </div>;
}
