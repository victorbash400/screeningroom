import { useEffect, useRef, useState } from "react";
import type { Conversation, FileNode, Message, Workspace } from "../../lib/types";
import ChatHeader from "./ChatHeader";
import ChatHistory from "./ChatHistory";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import styles from "./ChatDrawer.module.css";
interface Props {
  busy: boolean;
  onStop: () => void;
  referenceId?: string;
  referenceRequest: number;
  conversation: Conversation;
  thread?: Message;
  draft: string;
  onThread: (id?: string) => void;
  conversations: Conversation[];
  nodes: FileNode[];
  workspaces: Workspace[];
  workspaceId: string;
  onClose: () => void;
  onNew: () => boolean;
  onSelect: (id: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onDraft: (value: string) => boolean;
  onSend: (text: string, referenceIds?: string[]) => boolean;
  onReference: (id: string) => void;
}
export default function ChatDrawer({
  busy,
  onStop,
  conversation,
  thread,
  draft,
  onThread,
  conversations,
  nodes,
  workspaces,
  workspaceId,
  onClose,
  onNew,
  onSelect,
  onRename,
  onDelete,
  onDraft,
  onSend,
  onReference,
  referenceId,
  referenceRequest,
}: Props) {
  const channel = conversation.channel ?? "chat";
  const label = {
    chat: "Chats",
    locations: "Locations",
    similar: "Similar",
    performance: "Performance",
    compare: "Compare",
  }[channel];
  const drawer = useRef<HTMLElement>(null);
  const previousFocus = useRef(
    typeof document !== "undefined" ? document.activeElement : null,
  );
  useEffect(() => {
    drawer.current?.querySelector("textarea")?.focus();
    return () => {
      if (previousFocus.current instanceof HTMLElement)
        previousFocus.current.focus();
    };
  }, []);
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <aside
      ref={drawer}
      className={`${styles.drawer} ${channel === "locations" ? styles.locations : ""}`}
      aria-label={label}
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          (event.target instanceof Element &&
            event.target.closest("dialog[open]"))
        )
          return;
        if (event.key === "Escape") {
          event.stopPropagation();
          if (historyOpen) setHistoryOpen(false);
          else onClose();
        }
      }}
    >
      <ChatHeader
        label={label}
        conversation={conversation}
        historyOpen={historyOpen}
        onHistory={() => setHistoryOpen(!historyOpen)}
        onClose={onClose}
        onRename={onRename}
        onDelete={onDelete}
        threadOpen={Boolean(thread)}
        onBack={() => onThread()}
      />
      <div className={styles.body}>
        <MessageList
          key={`messages-${conversation.id}-${thread?.id ?? "main"}`}
          messages={conversation.messages}
          threadId={thread?.id}
          onReply={onThread}
          nodes={nodes}
          onReference={onReference}
        />
        <ChatComposer
          busy={busy}
          onStop={onStop}
          workspaces={workspaces}
          workspaceId={workspaceId}
          initialReferenceId={referenceId}
          referenceRequest={referenceRequest}
          key={`composer-${conversation.id}-${thread?.id ?? "main"}`}
          draft={draft}
          nodes={nodes}
          onDraft={onDraft}
          onSend={onSend}
        />
        {historyOpen && (
          <>
            <button
              className={styles.scrim}
              aria-label="Close chats"
              onClick={() => setHistoryOpen(false)}
            />
            <ChatHistory
              items={conversations}
              activeId={conversation.id}
              onNew={() => {
                if (onNew()) setHistoryOpen(false);
              }}
              onSelect={(id) => {
                onSelect(id);
                setHistoryOpen(false);
              }}
            />
          </>
        )}
      </div>
    </aside>
  );
}
