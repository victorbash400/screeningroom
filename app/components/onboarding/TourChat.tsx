import { useState } from "react";
import type { Conversation } from "../../lib/types";
import type { TourStep } from "../../lib/productTour";
import ChatDrawer from "../chat/ChatDrawer";
import { exampleFiles, exampleWorkspace, exampleMap, exampleArea, exampleQuestion } from "./tourExample";
import { tourAnswer, tourMessages, tourUserMessage } from "./tourConversation";

const conversation: Conversation = { id: "tour-chat", workspaceId: exampleWorkspace.id, scope: "workspace", channel: "locations", title: "Audience", messages: [], draft: "" };
export default function TourChat({ step, selected, onClose, onReference }: { step: TourStep; selected: string[]; onClose: () => void; onReference: (id: string) => void }) {
  const [current, setCurrent] = useState<Conversation>(() => ({ ...conversation, audienceMode: step === "digital" ? "digital" : "live", mapScene: exampleMap, locationInterest: exampleArea, draft: step === "question" ? exampleQuestion : "", messages: ["live", "digital", "evidence"].includes(step) ? tourMessages(step === "digital" ? "digital" : "live") : [] }));
  const [threadId, setThreadId] = useState<string>();
  const [items, setItems] = useState<Conversation[]>([{ ...conversation, id: "tour-saved-chat", scope: undefined, title: "Screening in London", messages: tourMessages("live") }]);
  function newChat() {
    if (current.messages.length) setItems(previous => [...previous, { ...current, id: crypto.randomUUID(), scope: undefined, title: current.messages.find(message => message.role === "user")?.text ?? "Audience" }]);
    setCurrent(previous => ({ ...previous, draft: "", messages: [] })); setThreadId(undefined); return true;
  }
  return <ChatDrawer embeddedPicker initialMapOpen={["live", "digital"].includes(step)} initialReferenceIds={selected}
    conversation={current} draft={current.draft} workspaceId={exampleWorkspace.id} workspaces={[exampleWorkspace]} nodes={exampleFiles}
    conversations={items} thread={current.messages.find(message => message.id === threadId)} onThread={setThreadId} busy={false} onStop={() => {}} referenceRequest={0}
    onClose={onClose} onNew={newChat} onRename={() => {}} onDelete={id => setItems(previous => previous.filter(item => item.id !== id))}
    onSelect={id => { const next = items.find(item => item.id === id); if (next) setCurrent(previous => ({ ...previous, messages: next.messages, draft: "" })); }}
    onDraft={draft => { setCurrent(previous => ({ ...previous, draft })); return true; }}
    onSend={(text, referenceIds = []) => { const id = crypto.randomUUID(); setCurrent(previous => ({ ...previous, draft: "", messages: [...previous.messages,
      { ...tourUserMessage(id, text || "Analyze the selected media.", referenceIds), ...(threadId ? { replyToId: threadId } : {}) },
      { ...tourAnswer(`${id}:answer`, previous.audienceMode ?? "live"), ...(threadId ? { replyToId: threadId } : {}) },
    ] })); return true; }}
    onReference={onReference} onAudienceMode={audienceMode => { setCurrent(previous => ({ ...previous, audienceMode })); return true; }}
    onMapScene={mapScene => { setCurrent(previous => ({ ...previous, mapScene })); return true; }}
    onLocationInterest={locationInterest => { setCurrent(previous => ({ ...previous, locationInterest })); return true; }}
    onAudienceWidget={() => true} />;
}
