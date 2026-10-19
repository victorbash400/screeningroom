import { useEffect, useRef } from "react";
import type { Message, FileNode } from "../../lib/types";
import MessageBubble from "./MessageBubble";
import { useScrollEdges } from "../../state/useScrollEdges";
import edges from "../controls/ScrollEdges.module.css";
import styles from "./MessageList.module.css";
function sameGroup(first?: Message, second?: Message) {
  if (!first || !second) return false;
  const a = new Date(first.createdAt),
    b = new Date(second.createdAt);
  return (
    (first.role ?? "user") === (second.role ?? "user") &&
    a.toDateString() === b.toDateString() &&
    Math.abs(a.getTime() - b.getTime()) < 300_000
  );
}
export default function MessageList({
  messages,
  followOutput = true,
  threadId,
  onReply,
  nodes,
  onReference,
}: {
  messages: Message[];
  followOutput?: boolean;
  threadId?: string;
  onReply: (id: string) => void;
  nodes: FileNode[];
  onReference: (id: string) => void;
}) {
  const items = messages.filter((message) =>
    threadId
      ? message.id === threadId || message.replyToId === threadId
      : !message.replyToId,
  );
  const replyParents = new Set(messages.map((message) => message.replyToId));
  const list = useScrollEdges<HTMLDivElement>();
  const atBottom = useRef(true);
  useEffect(() => {
    if (followOutput && atBottom.current && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [messages, followOutput]);
  return (
    <div
      ref={list}
      className={`${styles.messages} ${edges.edges}`}
      role="log"
      aria-label="Messages"
      aria-live="polite"
      onScroll={(event) => {
        const element = event.currentTarget;
        atBottom.current =
          element.scrollHeight - element.clientHeight - element.scrollTop < 80;
      }}
    >
      <div className={styles.content}>
        {items.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            reference={nodes.find((node) => node.id === message.referenceId)}
            groupStart={!sameGroup(items[index - 1], message)}
            onReference={onReference}
            hasReplies={!threadId && replyParents.has(message.id)}
            onReply={() => onReply(threadId ?? message.id)}
          />
        ))}
      </div>
    </div>
  );
}
