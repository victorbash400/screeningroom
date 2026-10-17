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
const { searchMapPlaces, showMapLocations } = await import("../app/tools/map-locations.ts");
const { mapPresentationSchema } = await import("../app/lib/mapScene.ts");
const { parseData, emptyData } = await import("../app/lib/storage.ts");
const { streamAgentReply } = await import("../app/lib/agentChat.ts");
const area = { name: "Paris", latitude: 48.85826, longitude: 2.2945, radius: 5000 };

test("place search preserves provider coordinate order and surfaces provider failures", async () => {
  const original = globalThis.fetch;
  try {
    let requested;
    globalThis.fetch = async (url) => {
      requested = url;
      return Response.json({ features: [{ geometry: { type: "Point", coordinates: [2.2945, 48.85826] }, properties: { name: "Eiffel Tower", city: "Paris", country: "France" } }] });
    };
    const places = await searchMapPlaces.execute({ query: "Eiffel Tower & Paris" }, { toolCallId: "test", messages: [] });
    assert.equal(requested.searchParams.get("q"), "Eiffel Tower & Paris");
    assert.deepEqual(places[0], { name: "Eiffel Tower", detail: "Paris, France", latitude: 48.85826, longitude: 2.2945 });
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    await assert.rejects(searchMapPlaces.execute({ query: "Paris" }, { toolCallId: "test", messages: [] }), { message: "Place search unavailable. Try again." });
  } finally { globalThis.fetch = original; }
});

test("map commands and saved areas survive backend data validation with invalid coordinates rejected", async () => {
  const presentation = await showMapLocations.execute({ locations: [{ name: "Eiffel Tower", latitude: area.latitude, longitude: area.longitude }], focusIndex: 0, zoom: 16 }, { toolCallId: "map", messages: [] });
  const value = { ...emptyData, workspaces: [{ id: "w", name: "Workspace" }], conversations: [{ id: "c", workspaceId: "w", title: "Places", channel: "locations", draft: "", messages: [], locationInterest: area, mapScene: { id: "map", presentation } }] };
  const restored = parseData(JSON.stringify(value)).conversations[0];
  assert.deepEqual(restored.locationInterest, area);
  assert.deepEqual(restored.mapScene.presentation, presentation);
  assert.equal(mapPresentationSchema.safeParse({ ...presentation, focusIndex: 1 }).success, false);
  value.conversations[0].mapScene.presentation.locations[0].latitude = 91;
  assert.throws(() => parseData(JSON.stringify(value)), { message: "Saved map locations are invalid." });
});

test("chat transport carries the selected area and delivers structured map tool output before the answer", async () => {
  let sent;
  const presentation = { locations: [{ name: "Eiffel Tower", latitude: area.latitude, longitude: area.longitude }], zoom: 16 };
  const chunks = [
    { type: "start", messageId: "answer" },
    { type: "tool-input-available", toolCallId: "map", toolName: "showMapLocations", input: presentation },
    { type: "tool-output-available", toolCallId: "map", output: presentation },
    { type: "text-start", id: "text" }, { type: "text-delta", id: "text", delta: "Shown on the map." }, { type: "text-end", id: "text" },
    { type: "finish", finishReason: "stop" },
  ];
  const requestFetch = async (_, init) => {
    sent = JSON.parse(init.body);
    return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } });
  };
  let received;
  await streamAgentReply("locations", [{ role: "user", content: "Show Paris" }], new AbortController().signal, (message) => { received = message; }, requestFetch, area);
  assert.deepEqual(sent.locationInterest, area);
  assert.deepEqual(received.parts.find((part) => part.type === "tool-showMapLocations").output, presentation);
});
