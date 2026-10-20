import "./helpers/qloo-fetch.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import test from "node:test";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return next("next/server.js", context);
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
    await assert.rejects(qlooRequest("/search", {}), { message: "Qloo is temporarily rate limiting requests. Try again shortly." });
    globalThis.fetch = async () => Response.json({ results: "invalid" });
    await assert.rejects(qlooRequest("/search", {}), { status: 502, message: "Qloo returned invalid results. Try again." });
  } finally { globalThis.fetch = original; }
});


test("nullable catalogue metadata does not reject valid entities or leak nulls into result cards", async () => {
  const original = globalThis.fetch;
  const { findSimilar } = await import("../app/tools/find-similar.ts");
  const item = { entity_id: id, name: "Cinema", location: { lat: -1.29, lon: 36.82 }, types: null, subtype: null,
    properties: { address: null, description: null, website: null, release_year: null, image: { url: null } } };
  try {
    globalThis.fetch = async (url) => Response.json(url.pathname === "/search" ? { results: [item] } : { success: true, results: { entities: [item] } });
    const result = await qlooRequest("/search", {});
    assert.equal(result[0].name, "Cinema");
    assert.deepEqual(result[0].location, item.location);
    assert.equal(result[0].properties.description, undefined);
    const cards = await findSimilar.execute({ type: "place", entityIds: [id], take: 1 }, { toolCallId: "t", messages: [] });
    assert.deepEqual(cards, [{ id, name: "Cinema" }]);
    globalThis.fetch = async () => Response.json({ results: [{ ...item, properties: null }] });
    assert.equal((await qlooRequest("/search", {}))[0].properties, undefined);
  } finally { globalThis.fetch = original; }
});

test("required entity names remain strict and upstream failures are not reported as user input errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ success: true, results: { entities: [{ entity_id: id, name: null }] } });
    await assert.rejects(qlooRequest("/v2/insights", {}), { status: 502, message: "Qloo returned invalid results. Try again." });
  } finally { globalThis.fetch = original; }
});


test("provider timeouts and network failures remain actionable without masking cancellation", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new DOMException("timeout", "TimeoutError"); };
    await assert.rejects(qlooRequest("/search", {}), { status: 504, message: "Qloo request timed out. Try again." });
    globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
    await assert.rejects(qlooRequest("/search", {}), { status: 502, message: "Qloo could not be reached. Try again." });
    globalThis.fetch = async () => new Response("provider error", { status: 503 });
    await assert.rejects(qlooRequest("/search", {}), { status: 502, message: "Qloo request failed (503). Try again." });
    const controller = new AbortController(), reason = new Error("User stopped request");
    controller.abort(reason);
    globalThis.fetch = async () => { throw reason; };
    await assert.rejects(qlooRequest("/search", {}, controller.signal), error => error === reason);
  } finally { globalThis.fetch = original; }
});
