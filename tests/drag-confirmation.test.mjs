import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const stubs = new Map([
  ["react", "export function useState(value) { return [value, () => {}]; }"],
  [
    "./RoomDataContext",
    "export function useRoomStore() { return globalThis.dragTest.room; }",
  ],
  [
    "./useRoomActions",
    "export function useRoomActions() { return globalThis.dragTest.actions; }",
  ],
]);
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/useNodeDrag.ts")) {
      if (stubs.has(specifier))
        return {
          url: `data:text/javascript,${encodeURIComponent(stubs.get(specifier))}`,
          shortCircuit: true,
        };
      if (["../lib/storage", "../lib/importFiles"].includes(specifier))
        return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { useNodeDrag } = await import("../app/state/useNodeDrag.ts");
const { emptyData } = await import("../app/lib/storage.ts");
function setup() {
  const requests = [],
    writes = [];
  const room = {
    data: {
      ...emptyData,
      workspaces: [
        { id: "w", name: "Workspace" },
        { id: "other", name: "Other" },
      ],
      nodes: [
        {
          id: "folder",
          kind: "folder",
          name: "Folder",
          workspaceId: "w",
          parentId: null,
        },
        {
          id: "nested",
          kind: "folder",
          name: "Nested",
          workspaceId: "w",
          parentId: "folder",
        },
        {
          id: "file",
          kind: "file",
          name: "clip.mp4",
          workspaceId: "w",
          parentId: null,
        },
      ],
    },
    dragging: { current: "file" },
    confirmDrop: (request) => requests.push(request),
    setError: (message) => {
      throw new Error(message);
    },
  };
  globalThis.dragTest = {
    room,
    actions: {
      move: (id, parentId) => {
        writes.push({ id, parentId });
        return true;
      },
      importEntries: async (entries, workspaceId, parentId) => {
        writes.push({ entries, workspaceId, parentId });
        return true;
      },
    },
  };
  return { room, requests, writes };
}
const event = (items = []) => ({
  dataTransfer: {
    types: items.length ? ["Files"] : ["application/x-screeningroom-node"],
    items,
  },
  preventDefault() {},
  stopPropagation() {},
});

test("moving a file waits for confirmation and retains the destination path", async () => {
  const { requests, writes } = setup();
  await useNodeDrag("w", "nested").onDrop(event());
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].kind, "move");
  assert.deepEqual(requests[0].destination, ["Workspace", "Folder", "Nested"]);
  assert.deepEqual(requests[0].names, ["clip.mp4"]);
  assert.equal(await requests[0].run(), true);
  assert.deepEqual(writes, [{ id: "file", parentId: "nested" }]);
});
test("folders cannot be dropped into descendants or other workspaces", async () => {
  const { room, requests, writes } = setup();
  room.dragging.current = "folder";
  await useNodeDrag("w", "nested").onDrop(event());
  await useNodeDrag("other", null).onDrop(event());
  await useNodeDrag("w", null).onDrop(event());
  assert.equal(requests.length, 0);
  assert.equal(writes.length, 0);
});
test("external file drops are read but not imported until confirmed", async () => {
  const { room, requests, writes } = setup();
  room.dragging.current = null;
  const file = new File(["preview"], "clip.txt", { type: "text/plain" });
  await useNodeDrag("w", "folder", room.data.nodes[0]).onDrop(
    event([{ kind: "file", getAsFile: () => file }]),
  );
  assert.equal(writes.length, 0);
  assert.equal(requests[0].kind, "import");
  assert.deepEqual(requests[0].names, ["clip.txt"]);
  assert.deepEqual(requests[0].destination, ["Workspace", "Folder"]);
  await requests[0].run();
  assert.equal(writes[0].entries[0].file, file);
  assert.equal(writes[0].parentId, "folder");
});
test("external folders keep their children while awaiting confirmation", async () => {
  const { requests, writes } = setup();
  let page = 0;
  const folder = {
    name: "Footage",
    isDirectory: true,
    isFile: false,
    createReader: () => ({
      readEntries: (resolve) =>
        resolve(
          page++
            ? []
            : [
                {
                  name: "Empty",
                  isDirectory: true,
                  isFile: false,
                  createReader: () => ({
                    readEntries: (resolve) => resolve([]),
                  }),
                },
              ],
        ),
    }),
  };
  await useNodeDrag("w", null).onDrop(
    event([{ kind: "file", webkitGetAsEntry: () => folder }]),
  );
  assert.equal(writes.length, 0);
  assert.deepEqual(requests[0].names, ["Footage"]);
  await requests[0].run();
  assert.deepEqual(writes[0].entries, [
    {
      kind: "folder",
      name: "Footage",
      children: [{ kind: "folder", name: "Empty", children: [] }],
    },
  ]);
});
