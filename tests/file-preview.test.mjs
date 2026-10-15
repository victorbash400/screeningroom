import assert from "node:assert/strict";
import test from "node:test";
import { filePreview } from "../app/lib/filePreview.ts";
const file = (name, content) => ({
  id: "f",
  workspaceId: "w",
  parentId: null,
  name,
  kind: "file",
  content,
  updatedAt: "2026-10-15T00:00:00Z",
});
test("text previews retain markup as text and decode UTF-8", () => {
  const text = "<script>alert('test')</script>\n你好";
  assert.deepEqual(
    filePreview(
      file("page.html", `data:text/html,${encodeURIComponent(text)}`),
    ),
    { kind: "text", text },
  );
});
test("supported media are selected from explicit MIME types", () => {
  for (const [mime, kind] of [
    ["image/png", "image"],
    ["image/svg+xml", "image"],
    ["video/mp4", "video"],
    ["audio/mpeg", "audio"],
    ["application/pdf", "pdf"],
  ]) {
    const source = `data:${mime};base64,AA==`;
    assert.deepEqual(filePreview(file("media.bin", source)), { kind, source });
  }
});
test("active documents stay text and unstructured external sources are rejected", () => {
  assert.deepEqual(
    filePreview(file("media.bin", "data:text/html,<h1>active</h1>")),
    { kind: "text", text: "<h1>active</h1>" },
  );
  for (const source of ["data:application/javascript,alert(1)"])
    assert.throws(() => filePreview(file("media.bin", source)), {
      message: "Preview unavailable for this file type.",
    });
  assert.throws(
    () => filePreview(file("picture.png", "https://example.com/picture.png")),
    { message: "File content is invalid." },
  );
  assert.throws(() => filePreview(file("missing.txt", undefined)), {
    message: "File content is unavailable.",
  });
});

test("links use explicit providers and safe URL schemes", () => {
  assert.equal(
    filePreview({ ...file("Video"), sourceUrl: "https://youtu.be/jfKfPfyJRdk" })
      .kind,
    "youtube",
  );
  assert.equal(
    filePreview({
      ...file("Audio"),
      sourceUrl: "https://example.com/clip.mp3?x=1",
    }).kind,
    "audio",
  );
  assert.equal(
    filePreview({ ...file("Page"), sourceUrl: "https://example.com/page" })
      .kind,
    "link",
  );
  assert.throws(() =>
    filePreview({ ...file("Bad"), sourceUrl: "javascript:alert(1)" }),
  );
  assert.throws(() =>
    filePreview({
      ...file("Bad"),
      sourceUrl: "https://user:secret@example.com",
    }),
  );
  assert.equal(
    filePreview({ ...file("Clip", "local-file:abc"), mimeType: "video/mp4" })
      .kind,
    "video",
  );
});
