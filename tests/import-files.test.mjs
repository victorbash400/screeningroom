import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareImport,
  readDroppedItems,
  pickedEntries,
} from "../app/lib/importFiles.ts";
const blobs = new Map();
async function saveFile(file) {
  const id = "cloud-file:" + crypto.randomUUID();
  blobs.set(id, file);
  return id;
}
test("imports preserve empty directories, nested parents, and file bytes", async () => {
  const nodes = await prepareImport(
    [
      {
        kind: "folder",
        name: "Art",
        children: [
          { kind: "folder", name: "Empty", children: [] },
          {
            kind: "file",
            file: new File(["你好"], "notes.txt", { type: "text/plain" }),
          },
        ],
      },
    ],
    "workspace",
    "parent",
    saveFile,
  );
  assert.equal(nodes.length, 3);
  const root = nodes.find((node) => node.name === "Art"),
    empty = nodes.find((node) => node.name === "Empty"),
    file = nodes.find((node) => node.name === "notes.txt");
  assert.equal(root.parentId, "parent");
  assert.equal(empty.parentId, root.id);
  assert.equal(file.parentId, root.id);
  assert.equal(file.workspaceId, "workspace");
  assert.equal(file.size, 6);
  assert.equal(file.versions.length, 1);
  assert.equal(file.versions[0].content, file.content);
  assert.equal(file.versions[0].size, file.size);
  assert.equal(await blobs.get(file.content).text(), "你好");
});
test("duplicate sibling names reject the import", async () => {
  await assert.rejects(
    prepareImport(
      [
        { kind: "folder", name: "ART", children: [] },
        { kind: "file", file: new File(["x"], "art") },
      ],
      "w",
      null,
    ),
    { message: "art already exists." },
  );
});
test("the same name is valid in separate directories", async () => {
  const nodes = await prepareImport(
    ["One", "Two"].map((name) => ({
      kind: "folder",
      name,
      children: [{ kind: "file", file: new File([name], "notes.txt") }],
    })),
    "w",
    null,
    saveFile,
  );
  const files = nodes.filter((node) => node.kind === "file");
  assert.equal(files.length, 2);
  assert.notEqual(files[0].parentId, files[1].parentId);
});
test("folder drops consume every directory page and preserve empty folders", async () => {
  const file = new File(["hello"], "notes.txt");
  const fileEntry = {
    isFile: true,
    isDirectory: false,
    name: file.name,
    file: (resolve) => resolve(file),
  };
  const empty = {
    isFile: false,
    isDirectory: true,
    name: "Empty",
    createReader: () => ({ readEntries: (resolve) => resolve([]) }),
  };
  const root = {
    isFile: false,
    isDirectory: true,
    name: "Root",
    createReader: () => {
      const pages = [[fileEntry], [empty], []];
      return { readEntries: (resolve) => resolve(pages.shift()) };
    },
  };
  const entries = await readDroppedItems([
    { kind: "file", webkitGetAsEntry: () => root },
  ]);
  assert.equal(entries[0].name, "Root");
  assert.equal(entries[0].children.length, 2);
  assert.equal(entries[0].children[0].file, file);
  assert.deepEqual(entries[0].children[1], {
    kind: "folder",
    name: "Empty",
    children: [],
  });
});
test("unreadable drops report an error instead of silently skipping files", async () => {
  await assert.rejects(
    readDroppedItems([{ kind: "file", getAsFile: () => null }]),
    { message: "Cannot read dropped item." },
  );
  await assert.rejects(readDroppedItems([{ kind: "string" }]), {
    message: "No files were dropped.",
  });
});

test("large media retain cloud object references and versions", async () => {
  const media = new File([new Uint8Array(2_000_001)], "clip.mp4", {
    type: "video/mp4",
  });
  let stored;
  const nodes = await prepareImport(
    [{ kind: "file", file: media }],
    "w",
    null,
    async (file) => {
      stored = file;
      return "cloud-file:test";
    },
  );
  assert.equal(stored, media);
  assert.equal(nodes[0].content, "cloud-file:test");
  assert.equal(nodes[0].versions[0].content, "cloud-file:test");
  assert.equal(nodes[0].mimeType, "video/mp4");
  let cleaned;
  await assert.rejects(
    prepareImport(
      [
        { kind: "file", file: media },
        { kind: "folder", name: "clip.mp4", children: [] },
      ],
      "w",
      null,
      async () => "cloud-file:test",
      async (contents) => {
        cleaned = contents;
      },
    ),
  );
  assert.deepEqual(cleaned, ["cloud-file:test"]);
});
test("folder picker paths retain their root and nested directories", () => {
  const file = new File(["test"], "note.txt");
  Object.defineProperty(file, "webkitRelativePath", {
    value: "Art/Notes/note.txt",
  });
  const entries = pickedEntries([file], true);
  assert.equal(entries[0].name, "Art");
  assert.equal(entries[0].children[0].name, "Notes");
  assert.equal(entries[0].children[0].children[0].file, file);
});

test("import progress counts saved bytes and preserves the destination", async () => {
  const progress = [];
  const nodes = await prepareImport(
    [
      { kind: "file", file: new File(["abc"], "first.txt") },
      { kind: "file", file: new File(["1234567"], "second.txt") },
    ],
    "workspace",
    "destination",
    saveFile,
    undefined,
    (value) => progress.push(value),
  );
  assert.deepEqual(progress.map((value) => value.completedBytes), [0, 3, 3, 10]);
  assert.ok(progress.every((value) => value.totalBytes === 10));
  assert.equal(progress.at(-1).completedItems, 2);
  assert.ok(nodes.every((node) => node.parentId === "destination"));
});
