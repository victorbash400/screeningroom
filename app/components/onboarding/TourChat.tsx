import { useState } from "react";
import type { Conversation, Message } from "../../lib/types";
import ChatDrawer from "../chat/ChatDrawer";
import { exampleFiles, exampleWorkspace, exampleMap, exampleArea } from "./tourExample";

const answer = "Start with comparable artists or films, then search London and inspect the returned audience evidence before shortlisting venues. This walkthrough uses example data.";
const toolMessage: Message = { id: "tour-evidence", role: "assistant", text: answer, createdAt: "2026-10-01T12:00:00Z", blocks: [{ id: "tool:tour-search", kind: "tool", tool: { id: "tour-search", name: "searchEntities", state: "done", trace: { input: { query: "Radiohead", type: "artist", take: 5 } } } }, { id: "tour-answer", kind: "text", text: answer }] };
const conversation: Conversation = { id: "tour-chat", workspaceId: exampleWorkspace.id, scope: "workspace", channel: "locations", title: "Audience", messages: [], draft: "" };
export default function TourChat({ step, selected, onClose }: { step: string; selected: string[]; onClose: () => void }) {
  const [current, setCurrent] = useState<Conversation>({ ...conversation, audienceMode: step === "digital" ? "digital" : "live", mapScene: exampleMap, locationInterest: exampleArea, messages: step === "evidence" ? [toolMessage] : [] });
  const [threadId, setThreadId] = useState<string>();
  const [items, setItems] = useState<Conversation[]>([{ ...conversation, scope: undefined, title: "Screening in London", messages: [toolMessage] }]);
  function newChat() { setCurrent(previous => ({ ...previous, draft: "", messages: [] })); setThreadId(undefined); return true; }
  return <ChatDrawer embeddedPicker initialMapOpen={["live", "digital", "evidence"].includes(step)} initialReferenceIds={selected}
    conversation={current} draft={current.draft} workspaceId={exampleWorkspace.id} workspaces={[exampleWorkspace]} nodes={exampleFiles}
    conversations={items} thread={current.messages.find(message => message.id === threadId)} onThread={setThreadId} busy={false} onStop={() => {}} referenceRequest={0}
    onClose={onClose} onNew={newChat} onRename={newChat} onDelete={id => setItems(previous => previous.filter(item => item.id !== id))}
    onSelect={id => { const next = items.find(item => item.id === id); if (next) setCurrent(previous => ({ ...previous, messages: next.messages, draft: "" })); }}
    onDraft={draft => { setCurrent(previous => ({ ...previous, draft })); return true; }}
    onSend={text => { const id = crypto.randomUUID(); setCurrent(previous => ({ ...previous, draft: "", messages: [...previous.messages,
      { id, role: "user", text: text || "Analyze the selected media.", createdAt: new Date().toISOString(), ...(threadId ? { replyToId: threadId } : {}) },
      { ...toolMessage, id: `${id}:answer`, ...(threadId ? { replyToId: threadId } : {}) },
    ] })); return true; }}
    onReference={() => {}} onAudienceMode={audienceMode => { setCurrent(previous => ({ ...previous, audienceMode })); return true; }}
    onMapScene={mapScene => { setCurrent(previous => ({ ...previous, mapScene })); return true; }}
    onLocationInterest={locationInterest => { setCurrent(previous => ({ ...previous, locationInterest })); return true; }}
    onAudienceWidget={() => true} />;
}
