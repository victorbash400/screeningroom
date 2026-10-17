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
const { audienceVenues } = await import("../app/server/audience-venues.ts");
const { locationInterestSchema, defaultLocationInterest } = await import("../app/lib/locationInterest.ts");
const { parseData, emptyData } = await import("../app/lib/storage.ts");
process.env.QLOO_HACKATHON_API_SERVER_URL = "https://qloo.example";
process.env.QLOO_HACKATHON_API_KEY = "test-key";

test("venue search uses the chosen area and exact category filters, with optional taste signals", async () => {
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = async (url) => {
    requested = url;
    return Response.json({ success: true, results: { entities: [{ entity_id: "venue", name: "Concert hall", location: { lat: -1.28, lon: 36.82 } }] } });
  };
  try {
    const area = { ...defaultLocationInterest, radius: 12000, venueTypes: ["music", "concert"] };
    const result = await audienceVenues(area, ["artist"]);
    assert.equal(requested.searchParams.get("filter.location"), "POINT(36.8219 -1.2921)");
    assert.equal(requested.searchParams.get("filter.location.radius"), "12000");
    assert.equal(requested.searchParams.get("filter.tags"), "urn:tag:category:place:live_music_venue,urn:tag:category:place:concert_hall");
    assert.equal(requested.searchParams.get("signal.interests.entities"), "artist");
    assert.deepEqual(result.locations, [{ name: "Concert hall", latitude: -1.28, longitude: 36.82 }]);
    await audienceVenues({ ...area, venueTypes: [] });
    assert.equal(requested.searchParams.has("signal.interests.entities"), false);
    assert.equal(requested.searchParams.get("filter.tags").split(",").length, 4);
  } finally { globalThis.fetch = original; }
});

test("empty results and missing coordinates fail explicitly instead of creating invented pins", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ success: true, results: { entities: [] } });
    await assert.rejects(audienceVenues(defaultLocationInterest), { message: "No venues found. Change the area or filters." });
    globalThis.fetch = async () => Response.json({ success: true, results: { entities: [{ entity_id: "venue", name: "No coordinates" }] } });
    await assert.rejects(audienceVenues(defaultLocationInterest), { message: "Venue results have no map coordinates." });
  } finally { globalThis.fetch = original; }
});

test("venue choices persist with the chat area while old areas remain valid", () => {
  assert.equal(locationInterestSchema.safeParse(defaultLocationInterest).success, true);
  assert.equal(locationInterestSchema.safeParse({ ...defaultLocationInterest, venueTypes: ["invented"] }).success, false);
  const area = { ...defaultLocationInterest, venueTypes: ["cinema", "theatre"] };
  const data = { ...emptyData, workspaces: [{ id: "w", name: "Workspace" }], conversations: [{ id: "c", workspaceId: "w", channel: "locations", title: "Audience", draft: "", messages: [], locationInterest: area }] };
  assert.deepEqual(parseData(JSON.stringify(data)).conversations[0].locationInterest, area);
});
