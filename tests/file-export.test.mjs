import assert from "node:assert/strict";
import test from "node:test";
import { downloadFile } from "../app/lib/fileTypes.ts";

test("exports preserve UTF-8 text and binary version bytes", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const links = [];
  const document = {
    body: { append() {} },
    createElement: () => {
      const link = { click() {}, remove() {} };
      links.push(link);
      return link;
    },
  };
  Object.defineProperty(globalThis, "document", { value: document, configurable: true });
  context.after(() => { delete globalThis.document; });
  const text = "Café — version check.\n你好\n";
  await downloadFile("notes.txt", `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
  assert.equal(links[0].download, "notes.txt");
  assert.equal(await (await fetch(links[0].href)).text(), text);
  await downloadFile("original.bin", "data:application/octet-stream;base64,AP9/gA==");
  assert.deepEqual(new Uint8Array(await (await fetch(links[1].href)).arrayBuffer()), new Uint8Array([0, 255, 127, 128]));
  await assert.rejects(downloadFile("invalid.txt", "https://example.com/file"), { message: "File content is invalid." });
  context.mock.timers.tick(60_000);
  await assert.rejects(fetch(links[0].href));
});
