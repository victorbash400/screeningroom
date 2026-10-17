import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LocationInterest } from "../../lib/locationInterest";
import type { Conversation, FileNode, Message, Workspace } from "../../lib/types";
import ChatHeader from "./ChatHeader";
import ChatHistory from "./ChatHistory";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import ChatStarters from "./ChatStarters";
import AudienceStarter from "./AudienceStarter";
import type { MapScene } from "../../lib/mapScene";
import styles from "./ChatDrawer.module.css";
const FloatingLocationMap = dynamic(() => import("../locations/FloatingLocationMap"), { ssr: false });
interface Props {
  onMapScene: (scene: MapScene) => boolean;
  onLocationInterest: (area?: LocationInterest) => boolean;
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
  onMapScene,
  onLocationInterest,
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
  const label = channel === "locations" ? "Audience" : "Chats";
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
  const [mapOpen, setMapOpen] = useState(true);
  function startChat(prompt: string) {
    if (!onDraft(prompt)) return;
    const input = drawer.current?.querySelector("textarea");
    input?.focus();
    queueMicrotask(() => input?.setSelectionRange(prompt.length, prompt.length));
  }
  return (
    <aside
      ref={drawer}
      className={styles.drawer}
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
        mapOpen={mapOpen}
        onMapToggle={channel === "locations" ? setMapOpen : undefined}
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
      {channel === "locations" && <FloatingLocationMap anchor={drawer} open={mapOpen}
        scene={conversation.mapScene} area={conversation.locationInterest} onArea={onLocationInterest} onScene={onMapScene} />}
      <div className={styles.body}>
        {conversation.messages.length === 0 && !thread ? (
          channel === "locations" ? <AudienceStarter onSelect={() => startChat("Help me find an audience for ")} />
            : <ChatStarters onSelect={startChat} />
        ) : <MessageList
          key={`messages-${conversation.id}-${thread?.id ?? "main"}`}
          messages={conversation.messages}
          threadId={thread?.id}
          onReply={onThread}
          nodes={nodes}
          onReference={onReference}
        />}
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
