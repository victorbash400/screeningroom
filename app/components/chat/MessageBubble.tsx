import { useCallback, useState } from "react";
import AssistantMessage from "./AssistantMessage";
import ContextMenu from "../controls/ContextMenu";
import MessageReferences from "./MessageReferences";
import type { Message, FileNode } from "../../lib/types";
import styles from "./MessageBubble.module.css";
export default function MessageBubble({
  message,
  reference,
  groupStart,
  onReference,
  onReply,
  hasReplies,
}: {
  message: Message;
  reference?: FileNode;
  groupStart: boolean;
  onReference: (id: string) => void;
  onReply: () => void;
  hasReplies: boolean;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const referenceName = message.referenceName ?? reference?.name;
  const tools = message.tools;
  const waiting = message.status === "streaming" && message.waiting;
  if (!message.text && !referenceName && !tools?.length && !message.blocks?.length && !waiting) return null;
  return (
    <div
      data-message-id={message.id}
      className={`${styles.row} ${groupStart ? styles.start : ""} ${message.role === "assistant" ? styles.assistant : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <div
        tabIndex={0}
        aria-label={`${message.role === "assistant" ? "Agent" : "You"}: ${message.text || referenceName || message.error || ""}`}
        onKeyDown={(event) => {
          if (
            event.key === "ContextMenu" ||
            (event.shiftKey && event.key === "F10")
          ) {
            event.preventDefault();
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            setMenu({ x: rect.left, y: rect.bottom });
          }
        }}
        className={styles.bubble}
      >
        {message.role === "assistant" ? <AssistantMessage message={message} onReference={onReference} /> : message.text && <div>{message.text}</div>}
        <MessageReferences message={message} reference={reference} onOpen={onReference} />
        {hasReplies && (
          <button className={styles.thread} onClick={onReply}>
            View thread
          </button>
        )}
      </div>
      {menu && (
        <ContextMenu
          {...menu}
          label="Message actions"
          onClose={closeMenu}
          entries={[{ label: "Reply in thread", action: onReply }]}
        />
      )}
    </div>
  );
}
