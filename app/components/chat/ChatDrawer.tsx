import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { defaultLocationInterest } from "../../lib/locationInterest";
import type { AudienceWidget } from "../../lib/audienceWidget";
import { AudienceMapProvider } from "../locations/AudienceMapContext";
import { useAudienceMapActions } from "../locations/useAudienceMapActions";
import type { LocationInterest } from "../../lib/locationInterest";
import type { Conversation, FileNode, Message, Workspace } from "../../lib/types";
import { channelLabel } from "../../lib/mediaWorkflows";
import { messageReferences } from "../../lib/chatSelection";
import ChatHeader from "./ChatHeader";
import ChatHistory from "./ChatHistory";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import AudienceStarter from "./AudienceStarter";
import type { MapScene } from "../../lib/mapScene";
import styles from "./ChatDrawer.module.css";
const FloatingLocationMap = dynamic(() => import("../locations/FloatingLocationMap"), { ssr: false });
interface Props {
  onAudienceWidget: (toolId: string, widget: AudienceWidget) => boolean;
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
  onDelete: (id: string) => void;
  onDraft: (value: string) => boolean;
  onSend: (text: string, referenceIds?: string[]) => boolean;
  onReference: (id: string) => void;
}
export default function ChatDrawer({
  onAudienceWidget,
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
  const label = channelLabel(channel);
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
  function newChat() {
    if (onNew()) setHistoryOpen(false);
  }
  function startChat(prompt: string) {
    if (!onDraft(prompt)) return;
    const input = drawer.current?.querySelector("textarea");
    input?.focus();
    queueMicrotask(() => input?.setSelectionRange(prompt.length, prompt.length));
  }
  const mapActions = useAudienceMapActions(conversation, busy, onSend, onMapScene, onAudienceWidget, setMapOpen);
  return (
    <AudienceMapProvider value={mapActions}>
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
        onNew={newChat}
        onClose={onClose}
        onRename={onRename}
        onDelete={() => onDelete(conversation.id)}
        threadOpen={Boolean(thread)}
        onBack={() => onThread()}
      />
      {channel === "locations" && <FloatingLocationMap anchor={drawer} open={mapOpen}
        scene={conversation.mapScene} area={conversation.locationInterest} onArea={onLocationInterest} onScene={onMapScene} />}
      <div className={styles.body}>
        {channel === "locations" && conversation.messages.length === 0 && !thread ? <AudienceStarter onSelect={() => startChat("Help me find an audience for ")} /> : <MessageList
          key={`messages-${conversation.id}-${thread?.id ?? "main"}`}
          messages={conversation.messages}
          threadId={thread?.id}
          onReply={onThread}
          nodes={nodes}
          onReference={onReference}
        />}
        <ChatComposer
          onOpenReference={onReference}
          initialReferenceIds={messageReferences(conversation.messages.findLast((message) => message.role !== "assistant") ?? { id: "", text: "", createdAt: "" }).map((reference) => reference.id)}
          area={channel === "locations" ? conversation.locationInterest ?? defaultLocationInterest : undefined}
          onLocation={channel === "locations" ? () => setMapOpen(true) : undefined}
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
              onDelete={onDelete}
              activeId={conversation.id}
              onNew={newChat}
              onSelect={(id) => {
                onSelect(id);
                setHistoryOpen(false);
              }}
            />
          </>
        )}
      </div>
    </aside>
    </AudienceMapProvider>
  );
}
