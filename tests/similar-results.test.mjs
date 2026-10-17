import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import test from "node:test";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && context.parentURL) {
    const file = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(file)) return next(file.href, context);
  }
  return next(specifier, context);
} });
const { findSimilar } = await import("../app/tools/find-similar.ts");
const { agentBlocks } = await import("../app/lib/agentActivity.ts");
const { parseData, emptyData } = await import("../app/lib/storage.ts");
process.env.QLOO_HACKATHON_API_SERVER_URL = "https://qloo.example";
process.env.QLOO_HACKATHON_API_KEY = "test-key";
const seed = "18B098FD-3D84-4609-BFF3-ADF9A0B00E40";

test("recommendations exclude seed items and carry real catalogue images without inventing missing metadata", async () => {
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = async (url) => {
    requested = url;
    return Response.json({ success: true, results: { entities: [
      { entity_id: "a", name: "Reference", properties: { image: { url: "https://images.qloo.com/reference.jpg" }, release_year: 2020, description: "Provider description" } },
      { entity_id: "b", name: "Without image" },
      { entity_id: "c", name: "Unsafe URL", properties: { image: { url: "javascript:alert(1)" }, website: "javascript:alert(1)" } },
    ] } });
  };
  try {
    const results = await findSimilar.execute({ type: "movie", entityIds: [seed], take: 6 }, { toolCallId: "similar", messages: [] });
    assert.equal(requested.searchParams.get("filter.exclude.entities"), seed);
    assert.equal(requested.searchParams.get("signal.interests.entities"), seed);
    assert.deepEqual(results[0], { id: "a", name: "Reference", image: "https://images.qloo.com/reference.jpg", year: 2020, description: "Provider description" });
    assert.deepEqual(results[1], { id: "b", name: "Without image" });
    assert.deepEqual(results[2], { id: "c", name: "Unsafe URL" });
  } finally { globalThis.fetch = original; }
});

test("streamed recommendation cards survive saving and reopening a chat", () => {
  const output = [{ id: "a", name: "Reference", image: "https://images.qloo.com/reference.jpg" }];
  const blocks = agentBlocks({ id: "reply", role: "assistant", parts: [{ type: "tool-findSimilar", toolCallId: "similar", state: "output-available", input: {}, output }] });
  const reply = { id: "reply", role: "assistant", text: "", createdAt: "2026-10-17T12:00:00Z", status: "complete", blocks };
  const data = { ...emptyData, workspaces: [{ id: "w", name: "Workspace" }], conversations: [{ id: "c", workspaceId: "w", channel: "similar", title: "Similar", draft: "", messages: [reply] }] };
  assert.deepEqual(parseData(JSON.stringify(data)).conversations[0].messages[0].blocks[0].tool.results, output);
  blocks[0].tool.results[0].image = "javascript:alert(1)";
  assert.throws(() => parseData(JSON.stringify(data)), { message: "Saved message data is invalid." });
});
