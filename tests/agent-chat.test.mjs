import assert from "node:assert/strict";
import test from "node:test";
import { chatHistory, streamAgentReply } from "../app/lib/agentChat.ts";
import { chatReference } from "../app/lib/chatReference.ts";
import { parseData, emptyData } from "../app/lib/storage.ts";

const message = (id, text, extra = {}) => ({ id, text, createdAt: "2026-10-16T10:00:00.000Z", ...extra });
test("history isolates threads and excludes interrupted replies", () => {
  const messages = [message("root", "Question"), message("other", "Other"), message("reply", "Answer", { role: "assistant", replyToId: "root" }), message("failed", "Partial", { role: "assistant", status: "failed", replyToId: "root" })];
  assert.deepEqual(chatHistory(messages, "root"), [{ role: "user", content: "Question" }, { role: "assistant", content: "Answer" }]);
  assert.equal(chatHistory(messages).length, 2);
});
test("history preserves messages and text without arbitrary truncation", () => {
  const history = chatHistory(Array.from({ length: 50 }, (_, index) => message(String(index), "a".repeat(13_000))));
  assert.equal(history.length, 50);
  assert.equal(history[0].role, "user");
  assert.equal(history[0].content.length, 13_000);
});
test("assistant roles and tool states survive storage validation", () => {
  const value = { ...emptyData, workspaces: [{ id: "w", name: "Workspace" }], conversations: [{ id: "c", workspaceId: "w", channel: "chat", title: "Chats", draft: "", messages: [message("a", "Answer", { role: "assistant", status: "complete", tools: [{ id: "t", name: "searchEntities", state: "done" }] })] }] };
  assert.equal(parseData(JSON.stringify(value)).conversations[0].messages[0].role, "assistant");
  value.conversations[0].messages[0].role = "system";
  assert.throws(() => parseData(JSON.stringify(value)), { message: "Saved message data is invalid." });
});
test("SDK transport streams text and preserves the chosen agent", async () => {
  const original = globalThis.fetch;
  let requestBody;
  const chunks = [{ type: "start", messageId: "a" }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Connected" }, { type: "text-end", id: "t" }, { type: "finish", finishReason: "stop" }];
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } });
  };
  try {
    let last;
    await streamAgentReply("locations", [{ role: "user", content: "Hello" }], new AbortController().signal, (value) => { last = value; });
    assert.equal(requestBody.agent, "locations");
    assert.equal(last.parts[0].text, "Connected");
  } finally { globalThis.fetch = original; }
});
test("stream failures are explicit instead of empty successful replies", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('data: {"type":"error","errorText":"Provider unavailable"}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } });
    await assert.rejects(streamAgentReply("chat", [{ role: "user", content: "Hello" }], new AbortController().signal, () => {}), { message: "Provider unavailable" });
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Sign in again." }), { status: 401 });
    await assert.rejects(streamAgentReply("chat", [{ role: "user", content: "Hello" }], new AbortController().signal, () => {}), { message: "Sign in again." });
  } finally { globalThis.fetch = original; }
});

test("mentions preserve full text and keep folder contents inside their workspace", async () => {
  const text = "Line one\n".repeat(3_000);
  const reference = await chatReference({ id: "f", name: "notes.txt", kind: "file", content: "data:text/plain," + encodeURIComponent(text) }, []);
  const data = JSON.parse(reference.slice(reference.indexOf("{")));
  assert.equal(data.contentAccess, "text");
  assert.equal(data.text, text);
  const folder = { id: "folder", name: "Folder", kind: "folder", workspaceId: "a" };
  const result = await chatReference(folder, [{ name: "Own", kind: "file", parentId: "folder", workspaceId: "a" }, { name: "Other", kind: "file", parentId: "folder", workspaceId: "b" }]);
  assert.equal(result.includes("Own"), true);
  assert.equal(result.includes("Other"), false);
});
