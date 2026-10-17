import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAccountData,
  directory,
  emptyData,
  folderPath,
  parseData,
} from "../app/lib/storage.ts";
import { readTextContent } from "../app/lib/fileTypes.ts";
import { removeRoomItem } from "../app/lib/removeRoomItem.ts";
const timestamp = "2026-10-15T07:00:00.000Z";
const node = (id, parentId, kind = "folder", name = id, workspaceId = "a") => ({
  id,
  parentId,
  kind,
  name,
  workspaceId,
  updatedAt: timestamp,
});
const fixture = () => ({
  ...emptyData,
  workspaces: [
    { id: "a", name: "First" },
    { id: "b", name: "Second" },
  ],
  nodes: [
    node("root", null),
    node("nested", "root"),
    node("note", "nested", "file", "note.txt"),
  ],
  conversations: [],
});
const validate = (data) => parseData(JSON.stringify(data));

test("existing and empty local data remain readable", () => {
  assert.deepEqual(validate(emptyData), emptyData);
  assert.deepEqual(validate(fixture()), fixture());
});
test("directory navigation sorts folders before files and retains parent scope", () => {
  const nodes = [
    node("z", null, "file", "alpha.txt"),
    node("b", null, "folder", "Beta"),
    node("a", null, "folder", "alpha"),
    node("hidden", "a"),
  ];
  assert.deepEqual(
    directory(nodes, null).map((item) => item.id),
    ["a", "b", "z"],
  );
  assert.deepEqual(
    directory(nodes, "a").map((item) => item.id),
    ["hidden"],
  );
});
test("opening a nested destination reconstructs every ancestor", () => {
  assert.deepEqual(
    folderPath(fixture(), "nested").map((item) => item.id),
    ["root", "nested"],
  );
  assert.deepEqual(folderPath(fixture(), null), []);
  assert.throws(() => folderPath(fixture(), "note"));
});
test("cycles, missing parents, and file parents fail explicitly", () => {
  const cyclic = fixture();
  cyclic.nodes[0].parentId = "nested";
  assert.throws(() => validate(cyclic));
  assert.throws(() => folderPath(cyclic, "nested"));
  const orphan = fixture();
  orphan.nodes[1].parentId = "missing";
  assert.throws(() => validate(orphan));
  const fileParent = fixture();
  fileParent.nodes[0].parentId = "note";
  assert.throws(() => validate(fileParent));
});
test("hierarchy and message references cannot cross workspace boundaries", () => {
  const hierarchy = fixture();
  hierarchy.nodes[1].workspaceId = "b";
  assert.throws(() => validate(hierarchy));
  const messages = fixture();
  messages.conversations.push({
    id: "chat",
    workspaceId: "b",
    title: "Review",
    draft: "",
    messages: [
      {
        id: "message",
        text: "Review",
        createdAt: timestamp,
        referenceId: "note",
      },
    ],
  });
  assert.throws(() => validate(messages));
});
test("chat reference snapshots survive removal and reject invalid references", () => {
  const data = fixture();
  const message = {
    id: "reference",
    text: "",
    createdAt: timestamp,
    referenceId: "note",
    referenceName: "note.txt",
    referenceKind: "file",
  };
  data.conversations.push({
    id: "chat",
    workspaceId: "a",
    title: "Review",
    draft: "",
    messages: [message],
  });
  data.nodes = data.nodes.filter((item) => item.id !== "note");
  assert.deepEqual(validate(data).conversations[0].messages[0], message);
  message.referenceName = "";
  assert.throws(() => validate(data));
  message.referenceName = "note.txt";
  message.referenceKind = "unknown";
  assert.throws(() => validate(data));
  message.referenceKind = "file";
  data.nodes.push(node("note", null, "file", "note.txt", "b"));
  assert.throws(() => validate(data));
  delete message.referenceId;
  assert.throws(() => validate(data));
});
test("deleting a folder preserves references to its descendants and other workspaces", () => {
  const data = fixture();
  const message = {
    id: "reference",
    text: "",
    createdAt: timestamp,
    referenceId: "note",
  };
  data.conversations.push({
    id: "chat",
    workspaceId: "a",
    title: "Review",
    draft: "",
    messages: [message],
  });
  data.nodes.push(node("other", null, "file", "other.txt", "b"));
  const deleted = removeRoomItem(data, "node", "root");
  assert.deepEqual(deleted.nodes.map((item) => item.id), ["other"]);
  assert.deepEqual(validate(deleted).conversations[0].messages[0], {
    ...message,
    referenceName: "note.txt",
    referenceKind: "file",
  });
  assert.equal(data.nodes.length, 4);
  const workspaceDeleted = removeRoomItem(data, "workspace", "a");
  assert.deepEqual(validate(workspaceDeleted).workspaces, [{ id: "b", name: "Second" }]);
  assert.equal(workspaceDeleted.conversations.length, 0);
});
test("duplicate identities and invalid persisted file history are rejected", () => {
  const duplicate = fixture();
  duplicate.nodes.push({ ...duplicate.nodes[0] });
  assert.throws(() => validate(duplicate));
  const history = fixture();
  history.nodes[2].versions = [
    { id: "v", content: "data:text/plain,ok", size: -1, createdAt: timestamp },
  ];
  assert.throws(() => validate(history));
});
test("text files decode UTF-8 data without rewriting their contents", () => {
  const text = "Nairobi — venue notes\nCapacity: 450";
  assert.equal(
    readTextContent(
      `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
    ),
    text,
  );
  assert.equal(
    readTextContent(
      `data:text/plain;base64,${Buffer.from(text).toString("base64")}`,
    ),
    text,
  );
  assert.throws(() => readTextContent("invalid"));
});

test("account deletion clears only that account and its drafts", () => {
  const values = new Map([
    ["screeningroom.v1", "anonymous"],
    ["screeningroom.v1.account.user", "owned"],
    ["screeningroom.v1.account.user.draft.chat", "draft"],
    ["screeningroom.appearance.user", "theme"],
    ["screeningroom.v1.account.user-other", "other account"],
    ["screeningroom.appearance.user-other", "other theme"],
  ]);
  const storage = {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  clearAccountData(storage, "user");
  assert.deepEqual(
    [...values.keys()],
    [
      "screeningroom.v1",
      "screeningroom.v1.account.user-other",
      "screeningroom.appearance.user-other",
    ],
  );
  clearAccountData(storage, "user");
  assert.equal(values.size, 3);
  assert.throws(() => clearAccountData(storage, ""), {
    message: "Account identity is missing.",
  });
});

test("thread parents and draft scopes must belong to the same conversation", () => {
  const base = fixture();
  base.conversations = [
    {
      id: "chat",
      workspaceId: "a",
      title: "Chat",
      draft: "main draft",
      threadDrafts: { root: "thread draft" },
      messages: [
        { id: "root", text: "Root", createdAt: timestamp },
        { id: "reply", text: "Reply", createdAt: timestamp, replyToId: "root" },
      ],
    },
  ];
  assert.deepEqual(validate(base), base);
  const broken = structuredClone(base);
  broken.conversations[0].messages[1].replyToId = "missing";
  assert.throws(() => validate(broken), {
    message: "Saved message thread is invalid.",
  });
  broken.conversations[0].messages[1].replyToId = "reply";
  assert.throws(() => validate(broken), {
    message: "Saved message thread is invalid.",
  });
  broken.conversations[0].messages[1].replyToId = "root";
  broken.conversations[0].threadDrafts = { reply: "invalid" };
  assert.throws(() => validate(broken), {
    message: "Saved thread draft parent is invalid.",
  });
});

test("research chats persist independently alongside legacy workspace chat", () => {
  const data = fixture();
  data.conversations = [undefined, "locations", "similar", "performance", "compare"].map((channel) => ({
    id: `workspace:a:${channel ?? "chat"}`,
    workspaceId: "a",
    scope: "workspace",
    ...(channel ? { channel } : {}),
    title: channel ?? "Chat",
    messages: [],
    draft: channel ?? "Legacy draft",
  }));
  assert.deepEqual(validate(data), data);
  const duplicate = { ...data, conversations: [...data.conversations, { ...data.conversations[1], id: "duplicate" }] };
  assert.throws(() => validate(duplicate));
  const invalid = { ...data, conversations: [{ ...data.conversations[0], channel: "unknown" }] };
  assert.throws(() => validate(invalid));
});

test("deleting a chat preserves other chats and workspace files", () => {
  const data = fixture();
  data.conversations = [
    { id: "first", workspaceId: "a", title: "First", draft: "", messages: [] },
    { id: "second", workspaceId: "a", title: "Second", draft: "", messages: [] },
  ];
  const removed = removeRoomItem(data, "conversation", "first");
  assert.deepEqual(removed.conversations, [data.conversations[1]]);
  assert.deepEqual(removed.workspaces, data.workspaces);
  assert.deepEqual(removed.nodes, data.nodes);
});
