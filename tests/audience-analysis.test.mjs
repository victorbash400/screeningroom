import "./helpers/qloo-fetch.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return next("next/server.js", context);
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const file = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(file)) return next(file.href, context);
  }
  return next(specifier, context);
} });
const { audienceTools } = await import("../app/tools/audience-analysis.ts");
const { populationResult } = await import("../app/server/population.ts");
const { audienceWidgetSchema } = await import("../app/lib/audienceWidget.ts");
const { agentBlocks } = await import("../app/lib/agentActivity.ts");
const { chatHistory, streamAgentReply } = await import("../app/lib/agentChat.ts");
const { parseData, emptyData } = await import("../app/lib/storage.ts");
const area = { name: "Nairobi", latitude: -1.2921, longitude: 36.8219, radius: 5000 };
const tools = audienceTools(area);
const options = { toolCallId: "t", messages: [] };
const signal = { title: "Documentary audience", entityIds: [], tagIds: ["urn:tag:genre:media:documentary"] };
process.env.QLOO_HACKATHON_API_SERVER_URL = "https://qloo.example";
process.env.QLOO_HACKATHON_API_KEY = "test-key";

test("audience tools resolve real tags and preserve demographic indices without inventing population shares", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => Response.json(url.pathname === "/v2/tags"
      ? { results: { tags: [{ id: signal.tagIds[0], name: "Documentary" }] } }
      : { success: true, results: { demographics: [{ entity_id: signal.tagIds[0], query: { age: { "25_to_29": -.34, "55_and_older": .47 }, gender: { male: -.46, female: .46 } } }] } });
    assert.deepEqual(await tools.searchAudienceTags.execute({ query: "documentary" }, options), [{ id: signal.tagIds[0], name: "Documentary" }]);
    const widget = await tools.getAudienceDemographics.execute(signal, options);
    assert.equal(widget.profiles[0].age[0].value, -.34);
    assert.equal(widget.profiles[0].gender[1].value, .46);
    assert.equal(widget.kind, "demographics");
    assert.equal(audienceWidgetSchema.safeParse(widget).success, true);
  } finally { globalThis.fetch = original; }
});

test("heatmaps use the selected area, retain true coordinates, and expose empty coverage honestly", async () => {
  const original = globalThis.fetch;
  let requested;
  try {
    globalThis.fetch = async (url) => { requested = url; return Response.json({ success: true, results: { heatmap: [{ location: { latitude: -1.29, longitude: 36.82, geohash: "kzf" }, query: { affinity: .9, affinity_rank: .8, popularity: .7 } }] } }); };
    const widget = await tools.getAudienceHeatmap.execute(signal, options);
    assert.equal(requested.searchParams.get("filter.location"), "POINT(36.8219 -1.2921)");
    assert.equal(requested.searchParams.get("filter.location.radius"), "5000");
    assert.deepEqual(widget.cells[0], { latitude: -1.29, longitude: 36.82, geohash: "kzf", affinity: .9, rank: .8, popularity: .7 });
    const model = await tools.getAudienceHeatmap.toModelOutput({ output: widget });
    assert.equal(model.value.cellCount, 1);
    assert.equal(model.value.cells, undefined);
    globalThis.fetch = async () => Response.json({ success: true, results: { heatmap: [] } });
    assert.deepEqual((await tools.getAudienceHeatmap.execute(signal, options)).cells, []);
    await assert.rejects(tools.getAudienceHeatmap.execute({ ...signal, tagIds: [] }, options), { status: 400 });
  } finally { globalThis.fetch = original; }
});

test("configured Geoapify venue discovery keeps safe facts and sends credentials only in headers", async () => {
  const original = globalThis.fetch;
  const previousProvider = process.env.VENUE_DATA_PROVIDER;
  let requested, headers;
  process.env.VENUE_DATA_PROVIDER = "geoapify"; process.env.GEOAPIFY_API_KEY = "test-geo-key";
  try {
    globalThis.fetch = async (url, init) => { requested = url; headers = init.headers; return Response.json({ features: [{ properties: {
      place_id: "1", lat: -1.29, lon: 36.82, name: "Cinema", formatted: "Cinema, Nairobi", website: "https://cinema.example",
    } }] }); };
    const widget = await tools.searchMapVenues.execute({ type: "cinema" }, options);
    assert.equal(requested.hostname, "api.geoapify.com");
    assert.equal(requested.searchParams.get("categories"), "entertainment.cinema");
    assert.equal(requested.searchParams.get("filter"), "circle:36.8219,-1.2921,5000");
    assert.equal(requested.href.includes("test-geo-key"), false);
    assert.equal(headers["X-API-Key"], "test-geo-key");
    assert.equal(widget.venues[0].id, "geoapify:1");
    assert.equal(widget.venues[0].affinity, undefined);
    delete process.env.GEOAPIFY_API_KEY;
    await assert.rejects(tools.searchMapVenues.execute({ type: "cinema" }, options), { status: 503 });
  } finally {
    globalThis.fetch = original;
    if (previousProvider === undefined) delete process.env.VENUE_DATA_PROVIDER; else process.env.VENUE_DATA_PROVIDER = previousProvider;
    delete process.env.GEOAPIFY_API_KEY;
  }
});

test("WorldPop submission and explicit result loading make one request each, with year and counts retained", async () => {
  const original = globalThis.fetch;
  const id = "00000000-0000-4000-8000-000000000005";
  let calls = 0;
  try {
    globalThis.fetch = async (_, init) => { calls++; assert.equal(JSON.parse(init.body).year, 2025); return Response.json({ task_id: id }); };
    const pending = await tools.getAreaPopulation.execute({ analysis: "agesex", year: 2025 }, options);
    assert.equal(pending.status, "pending");
    assert.equal(calls, 1);
    globalThis.fetch = async () => { calls++; return Response.json({ status: "success", result: { total_population: 1000, data_year: 2025, agesex_pyramid: [{ age: "25 to 30", male: 490, female: 510 }] } }); };
    const ready = await populationResult(pending);
    assert.equal(calls, 2);
    assert.equal(ready.total, 1000);
    assert.equal(ready.rows[0].female, 510);
    globalThis.fetch = async () => { calls++; return Response.json({ status: "pending", result: null }); };
    assert.equal((await populationResult(pending)).status, "pending");
    assert.equal(calls, 3);
  } finally { globalThis.fetch = original; }
});

test("audience widgets survive streaming, backend serialization, and follow-up context without huge heatmap dumps", () => {
  const output = { kind: "venues", area, source: "OpenStreetMap", venues: [{ id: "osm:node:1", name: "Cinema", latitude: -1.29, longitude: 36.82, source: "OpenStreetMap" }] };
  const blocks = agentBlocks({ id: "a", role: "assistant", parts: [{ type: "tool-searchMapVenues", toolCallId: "t", state: "output-available", input: { type: "cinema" }, output }, { type: "text", text: "Found a cinema." }] });
  const message = { id: "m", text: "Found a cinema.", createdAt: "2026-10-17T12:00:00Z", role: "assistant", status: "complete", blocks };
  const data = { ...emptyData, workspaces: [{ id: "w", name: "Workspace" }], conversations: [{ id: "c", workspaceId: "w", title: "Audience", channel: "locations", draft: "", messages: [message] }] };
  const restored = parseData(JSON.stringify(data)).conversations[0].messages[0];
  assert.deepEqual(restored.blocks[0].tool.widget, output);
  assert.equal(chatHistory([restored])[0].content.includes('"osm:node:1"'), true);
  data.conversations[0].messages[0].blocks[0].tool.widget.venues[0].latitude = 91;
  assert.throws(() => parseData(JSON.stringify(data)));
});

test("chat sends visible map venue facts as context for grounded follow-up questions", async () => {
  let sent;
  const scene = { id: "map", presentation: { locations: [{ id: "venue", name: "Cinema", latitude: -1.29, longitude: 36.82 }] } };
  const chunks = [{ type: "start", messageId: "a" }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Cinema" }, { type: "text-end", id: "t" }, { type: "finish", finishReason: "stop" }];
  await streamAgentReply("locations", [{ role: "user", content: "This venue?" }], new AbortController().signal, () => {}, async (_, init) => {
    sent = JSON.parse(init.body);
    return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } });
  }, area, scene);
  assert.deepEqual(sent.mapContext.places, scene.presentation.locations);
});

test("map updates preserve heat layers with venue results and clear old overlays when the search area changes", async () => {
  const { audienceMapUpdate } = await import("../app/lib/audienceMapUpdate.ts");
  const { mapPresentationSchema } = await import("../app/lib/mapScene.ts");
  const heatmap = { kind: "heatmap", title: "Audience", source: "Qloo", area, cells: [{ latitude: -1.29, longitude: 36.82, geohash: "kzf", affinity: .9, rank: .8, popularity: .7 }] };
  let scene = audienceMapUpdate("getAudienceHeatmap", heatmap, "heat").scene;
  scene = audienceMapUpdate("searchMapVenues", { kind: "venues", area, source: "OpenStreetMap", venues: [{ id: "1", name: "Cinema", latitude: -1.29, longitude: 36.82 }] }, "venues", scene).scene;
  assert.deepEqual(scene.presentation.heatmap, heatmap);
  assert.equal(scene.presentation.locations.length, 1);
  assert.equal(mapPresentationSchema.safeParse(scene.presentation).success, true);
  const changed = audienceMapUpdate("setAudienceArea", { ...area, radius: 10000 }, "area", scene);
  assert.equal(changed.area.radius, 10000);
  assert.deepEqual(changed.scene.presentation, { locations: [] });
});

test("WorldPop invalid results remain failures and cannot turn a missing breakdown into demographic counts", async () => {
  const original = globalThis.fetch;
  const widget = { kind: "population", source: "WorldPop", area, year: 2025, analysis: "agesex", taskId: "00000000-0000-4000-8000-000000000005", status: "pending" };
  try {
    globalThis.fetch = async () => Response.json({ status: "success", result: { total_population: 1000, data_year: 2025 } });
    await assert.rejects(populationResult(widget), { status: 502, message: "WorldPop returned no age and sex breakdown." });
    globalThis.fetch = async () => Response.json({ status: "success", result: { total_population: 1000, data_year: 2024 } });
    await assert.rejects(populationResult(widget), { status: 502, message: "WorldPop returned a different data year than requested." });
    assert.equal(audienceWidgetSchema.safeParse({ ...widget, status: "ready" }).success, false);
    assert.equal(audienceWidgetSchema.safeParse({ ...widget, status: "ready", total: 1000 }).success, false);
  } finally { globalThis.fetch = original; }
});


test("an agreed area change becomes the default for subsequent tools in the same agent turn", async () => {
  const original = globalThis.fetch;
  const scoped = audienceTools(area);
  let requested;
  try {
    globalThis.fetch = async (url) => { requested = url; return Response.json({ success: true, results: { heatmap: [] } }); };
    await scoped.setAudienceArea.execute({ ...area, radius: 10000 }, options);
    await scoped.getAudienceHeatmap.execute(signal, options);
    assert.equal(requested.searchParams.get("filter.location.radius"), "10000");
  } finally { globalThis.fetch = original; }
});

test("completed widget parsing is reused while answer tokens stream", () => {
  const completed = new Map();
  const output = { kind: "heatmap", title: "Audience", source: "Qloo", area, cells: [{ latitude: -1.29, longitude: 36.82, geohash: "kzf", affinity: .9, rank: .8, popularity: .7 }] };
  const part = { type: "tool-getAudienceHeatmap", toolCallId: "heat", state: "output-available", input: signal, output };
  const first = agentBlocks({ id: "a", role: "assistant", parts: [part] }, completed);
  const next = agentBlocks({ id: "a", role: "assistant", parts: [part, { type: "text", text: "Here" }] }, completed);
  assert.equal(first[0].tool, next[0].tool);
});
