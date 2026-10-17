import type { Message } from "../../lib/types";
import { messageBlocks } from "../../lib/messageBlocks";
import MessageText from "./MessageText";
import ToolCallIndicator from "./ToolCallIndicator";
import ChatLoadingIndicator from "./ChatLoadingIndicator";
import styles from "./AssistantMessage.module.css";
import AudienceWidgetView from "../locations/AudienceWidgetView";
import MediaAnalysisCard from "../research/MediaAnalysisCard";
import ResearchWidgetView from "../research/ResearchWidgetView";
import SimilarResults from "./SimilarResults";

export default function AssistantMessage({ message, onReference }: { message: Message; onReference?: (id: string) => void }) {
  return <div className={styles.content}>
    {messageBlocks(message).map((block) => block.kind === "tool"
      ? <div key={block.id}><ToolCallIndicator tool={block.tool} status={message.status} />
          {block.tool.state === "done" && block.tool.media && <MediaAnalysisCard analysis={block.tool.media} onOpen={onReference} />}
          {block.tool.state === "done" && block.tool.research && <ResearchWidgetView widget={block.tool.research} />}
          {block.tool.state === "done" && block.tool.results && <SimilarResults items={block.tool.results} />}
          {block.tool.state === "done" && block.tool.widget && <AudienceWidgetView widget={block.tool.widget} toolId={block.tool.id} />}</div>
      : block.text && <MessageText key={block.id} text={block.text} />)}
    {message.status === "streaming" && message.waiting && <ChatLoadingIndicator />}
  </div>;
}
