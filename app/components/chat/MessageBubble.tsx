import { useCallback, useState } from "react";
import ContextMenu from "../controls/ContextMenu";
import { FolderClosed } from "lucide-react";
import { fileIcon } from "../../lib/fileTypes";
import type { Message, FileNode } from "../../lib/types";
import styles from "./MessageBubble.module.css";
export default function MessageBubble({
  message,
  reference,
  groupStart,
  groupEnd,
  onReference,
  onReply,
  hasReplies,
}: {
  message: Message;
  reference?: FileNode;
  groupStart: boolean;
  groupEnd: boolean;
  onReference: (id: string) => void;
  onReply: () => void;
  hasReplies: boolean;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const referenceId = message.referenceId;
  const referenceName = message.referenceName ?? reference?.name;
  const referenceKind = message.referenceKind ?? reference?.kind;
  const Icon = referenceKind === "folder" ? FolderClosed : fileIcon(referenceName ?? "", reference?.sourceUrl, reference?.mimeType);
  return (
    <div
      className={`${styles.row} ${groupStart ? styles.start : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      {groupStart && (
        <time className={styles.time} dateTime={message.createdAt}>
          {new Date(message.createdAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </time>
      )}
      <div
        tabIndex={0}
        aria-label={message.text || referenceName || "Message"}
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
        className={`${styles.bubble} ${!groupStart ? styles.joined : ""} ${groupEnd ? styles.end : ""}`}
      >
        {message.text && <div>{message.text}</div>}
        {referenceId && referenceName && (
          <button
            className={styles.reference}
            onClick={() => onReference(referenceId)}
          >
            <Icon size={18} />
            {referenceName}
          </button>
        )}
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
