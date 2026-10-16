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
const { searchEntities } = await import("../app/tools/search-entities.ts");
const { tasteInsights } = await import("../app/tools/taste-insights.ts");
const { qlooRequest } = await import("../app/tools/qloo.ts");
process.env.QLOO_HACKATHON_API_SERVER_URL = "https://qloo.example";
process.env.QLOO_HACKATHON_API_KEY = "test-key";
const id = "18B098FD-3D84-4609-BFF3-ADF9A0B00E40";

test("tools encode searches and WKT location filters without exposing keys in URLs", async () => {
  const original = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return Response.json(url.pathname === "/search" ? { results: [{ entity_id: id, name: "Inception", properties: { release_year: 2010, akas: ["unneeded"] } }] } : { success: true, results: { entities: [] } });
  };
  try {
    const result = await searchEntities.execute({ query: "Inception & more", type: "movie", take: 2 }, { toolCallId: "t", messages: [] });
    assert.equal(request.url.searchParams.get("query"), "Inception & more");
    assert.equal(request.url.searchParams.get("types"), "urn:entity:movie");
    assert.equal(request.url.href.includes("test-key"), false);
    assert.equal(request.init.headers["X-Api-Key"], "test-key");
    assert.equal(result[0].properties.akas, undefined);
    await tasteInsights.execute({ type: "place", entityIds: [id], take: 2, location: { latitude: 40.7, longitude: -74, radius: 5000 } }, { toolCallId: "t", messages: [] });
    assert.equal(request.url.searchParams.get("filter.location"), "POINT(-74 40.7)");
    assert.equal(request.url.searchParams.get("filter.location.radius"), "5000");
  } finally { globalThis.fetch = original; }
});
test("provider failures and invalid response shapes fail explicitly", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("rate limited", { status: 429 });
    await assert.rejects(qlooRequest("/search", {}), { message: "Qloo request failed (429)." });
    globalThis.fetch = async () => Response.json({ results: "invalid" });
    await assert.rejects(qlooRequest("/search", {}), { name: "ZodError" });
  } finally { globalThis.fetch = original; }
});
