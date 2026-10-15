import { useEffect, useRef, useState } from "react";
import type { Conversation, FileNode, Message } from "../../lib/types";
import NewConversationDialog from "./NewConversationDialog";
import ConversationAudienceDialog from "./ConversationAudienceDialog";
import ChatHeader from "./ChatHeader";
import ChatHistory from "./ChatHistory";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import styles from "./ChatDrawer.module.css";
interface Props {
  referenceId?: string;
  referenceRequest: number;
  conversation: Conversation;
  thread?: Message;
  draft: string;
  onThread: (id?: string) => void;
  conversations: Conversation[];
  nodes: FileNode[];
  workspaceName: string;
  onClose: () => void;
  onNew: (name: string) => boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onDraft: (value: string) => boolean;
  onSend: (text: string, referenceId?: string) => boolean;
  onReference: (id: string) => void;
}
export default function ChatDrawer({
  conversation,
  thread,
  draft,
  onThread,
  conversations,
  nodes,
  workspaceName,
  onClose,
  onNew,
  error,
  onSelect,
  onRename,
  onDelete,
  onDraft,
  onSend,
  onReference,
  referenceId,
  referenceRequest,
}: Props) {
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
  const [creating, setCreating] = useState(false);
  const [audience, setAudience] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <aside
      ref={drawer}
      className={styles.drawer}
      aria-label="Agent chat"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (historyOpen) setHistoryOpen(false);
          else onClose();
        }
      }}
    >
      <ChatHeader
        conversation={conversation}
        historyOpen={historyOpen}
        onHistory={() => setHistoryOpen(!historyOpen)}
        onClose={onClose}
        onRename={onRename}
        onDelete={onDelete}
        onAudience={() => setAudience(true)}
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
          workspaceName={workspaceName}
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
              aria-label="Close conversations"
              onClick={() => setHistoryOpen(false)}
            />
            <ChatHistory
              items={conversations}
              activeId={conversation.id}
              onNew={() => {
                setCreating(true);
              }}
              onSelect={(id) => {
                onSelect(id);
                setHistoryOpen(false);
              }}
            />
          </>
        )}
      </div>
      {creating && (
        <NewConversationDialog
          error={error}
          onClose={() => setCreating(false)}
          onCreate={(name) => {
            const success = onNew(name);
            if (success) setHistoryOpen(false);
            return success;
          }}
        />
      )}
      {audience && (
        <ConversationAudienceDialog onClose={() => setAudience(false)} />
      )}
    </aside>
  );
}
