import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadBindings, transformSync } from "next/dist/build/swc/index.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
await loadBindings();
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    for (const extension of [".ts", ".tsx"]) {
      const file = new URL(specifier + extension, context.parentURL);
      if (existsSync(file)) return next(file.href, context);
    }
  }
  return next(specifier, context);
}, load(url, context, next) {
  if (url.endsWith(".css")) return { format: "module", source: 'export default new Proxy({}, {get: (_, key) => String(key)});', shortCircuit: true };
  if (url.endsWith(".tsx")) return { format: "module", source: transformSync(readFileSync(fileURLToPath(url), "utf8"), {
    jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "es6" },
  }).code, shortCircuit: true };
  return next(url, context);
} });
const { AccountProvider } = await import("../app/state/AccountContext.tsx");
const { AudienceMapProvider } = await import("../app/components/locations/AudienceMapContext.tsx");
const { default: AudienceWidgetView } = await import("../app/components/locations/AudienceWidgetView.tsx");
const { default: VenueCard } = await import("../app/components/locations/VenueCard.tsx");
const { default: ComposerLocation } = await import("../app/components/chat/ComposerLocation.tsx");
const { useAudienceMapActions } = await import("../app/components/locations/useAudienceMapActions.ts");
const area = { name: "Nairobi", latitude: -1.2921, longitude: 36.8219, radius: 5000 };
const place = { id: "osm:node:1", name: "Cinema", latitude: -1.29, longitude: 36.82, address: "Nairobi", source: "OpenStreetMap" };
const actions = { busy: false, showPlaces() {}, showHeatmap() {}, focusVenue() {}, hasVenue: () => true, ask() {}, updateWidget: () => true, showLocation() {} };
const render = (widget) => renderToStaticMarkup(createElement(AccountProvider, null, createElement(AudienceMapProvider, { value: actions }, createElement(AudienceWidgetView, { widget, toolId: "tool" }))));

test("audience widgets render source-labelled venue links, demographic indices, and resident counts", () => {
  const venue = render({ kind: "venues", area, source: "OpenStreetMap", venues: [place] });
  assert.ok(venue.includes("Cinema"));
  assert.ok(venue.includes("View map"));
  assert.ok(venue.includes("OpenStreetMap contributors"));
  const demographics = render({ kind: "demographics", title: "Documentary audience", source: "Qloo", profiles: [{ name: "Documentary", age: [{ label: "25–29", value: -.34 }], gender: [] }] });
  assert.ok(demographics.includes("-0.34"));
  assert.ok(demographics.includes("not population share"));
  const population = render({ kind: "population", source: "WorldPop", area, year: 2025, analysis: "population", taskId: "00000000-0000-4000-8000-000000000005", status: "ready", total: 1000 });
  assert.ok(population.includes("1,000"));
  assert.ok(population.includes("2025 estimate"));
  assert.equal(population.includes("Load result"), false);
});

test("venue popup exposes direct actions and the composer identifies its selected location", () => {
  const html = renderToStaticMarkup(createElement(VenueCard, { place, onAsk() {}, onSetArea() {}, onClose() {} }));
  assert.ok(html.includes('aria-label="Close venue"'));
  assert.ok(html.includes("Ask about this place"));
  assert.ok(html.includes("Search around this place"));
  const location = renderToStaticMarkup(createElement(ComposerLocation, { area, onClick() {} }));
  assert.ok(location.includes("Location of interest: Nairobi"));
});

test("map links focus the latest verified venue result without changing the search origin", () => {
  const widget = { kind: "venues", source: "OpenStreetMap", area, venues: [place] };
  const conversation = { mapScene: undefined, messages: [{ id: "m", text: "Cinema", blocks: [{ kind: "tool", id: "t", tool: { id: "t", name: "searchMapVenues", state: "done", widget } }] }] };
  let scene, opened = false;
  const map = useAudienceMapActions(conversation, false, () => true, (value) => { scene = value; return true; }, () => true, (value) => { opened = value; });
  assert.equal(map.hasVenue("invented"), false);
  map.focusVenue(place.id);
  assert.equal(opened, true);
  assert.deepEqual(scene.presentation.locations, [place]);
  assert.equal(scene.presentation.focusIndex, 0);
  assert.equal(scene.reframe, true);
  assert.equal(scene.locationInterest, undefined);
});

test("affinity widgets expose keyboard-expandable metric definitions and scale labels", () => {
  const heatmap = render({ kind: "heatmap", title: "Film affinity", source: "Qloo", area, cells: [{ latitude: 1, longitude: 2, geohash: "a", affinity: .8, rank: .9, popularity: .5 }] });
  assert.ok(heatmap.includes("<details"));
  assert.ok(heatmap.includes("About affinity"));
  assert.ok(heatmap.includes("Lower affinity"));
  assert.ok(heatmap.includes("Higher affinity"));
  assert.ok(heatmap.includes("ticket-sales forecast"));
});

test("venue updates preserve heatmap extent while an explicit venue focus can zoom in", async () => {
  const { audienceCamera } = await import("../app/lib/audienceCamera.ts");
  const { audienceMapUpdate } = await import("../app/lib/audienceMapUpdate.ts");
  const heatmap = { kind: "heatmap", title: "Film", source: "Qloo", area, cells: [
    { latitude: -2, longitude: 35, geohash: "a", affinity: .8, rank: .9, popularity: .5 },
    { latitude: 0, longitude: 38, geohash: "b", affinity: .5, rank: .6, popularity: .5 },
  ] };
  const initial = { id: "heat", presentation: { locations: [], heatmap } };
  const next = audienceMapUpdate("searchMapVenues", { kind: "venues", source: "Qloo", area, venues: [place] }, "venues", initial).scene;
  assert.equal(audienceCamera(initial).key, audienceCamera(next).key);
  const shown = audienceMapUpdate("showMapLocations", { locations: [place] }, "show", next).scene;
  assert.deepEqual(shown.presentation.heatmap, heatmap);
  assert.equal(audienceCamera(initial).key, audienceCamera(shown).key);
  const focused = { ...shown, presentation: { ...shown.presentation, focusIndex: 0 } };
  assert.deepEqual(audienceCamera(focused).center, place);
  assert.notEqual(audienceCamera(focused).key, audienceCamera(initial).key);
});

test("research widgets render responsive comparisons, exact chart values and accessible disclosure controls", async () => {
  const { default: ResearchWidgetView } = await import("../app/components/research/ResearchWidgetView.tsx");
  const chart = { kind: "chart", evidenceId: "e", title: "Click-through rate", source: "Campaign.csv", unit: "percent", view: "bar", basis: "Clicks / impressions from uploaded records.", series: [{ name: "CTR", points: [{ label: "Campaign A", value: 5 }, { label: "Campaign B", value: 2 }] }] };
  const html = renderToStaticMarkup(createElement(ResearchWidgetView, { widget: chart }));
  assert.ok(html.includes("5%"));
  assert.ok(html.includes('aria-label="Bar chart"'));
  assert.ok(html.includes("About this result"));
  const line = renderToStaticMarkup(createElement(ResearchWidgetView, { widget: { ...chart, view: "line" } }));
  assert.ok(line.includes("View values"));
  assert.ok(line.includes('role="img"'));
  assert.ok(line.includes("Campaign B"));
});

test("toolbar exposes only Chat and Audience", async () => {
  const { default: ResearchTabs } = await import("../app/components/workspace/ResearchTabs.tsx");
  const toolbar = renderToStaticMarkup(createElement(ResearchTabs, { selected: "locations", onSelect() {} }));
  for (const label of ["Chat", "Audience"]) assert.ok(toolbar.includes(`aria-label="${label}"`));
  for (const label of ["Similar media", "Compare", "Audience fit", "Performance"]) assert.equal(toolbar.includes(`aria-label="${label}"`), false);
});

test("media analysis widgets show sampled coverage, transcripts and explicit continuation", async () => {
  const { default: MediaAnalysisCard } = await import("../app/components/research/MediaAnalysisCard.tsx");
  const analysis = { kind: "media", fileId: "asset", name: "Speech.wav", modality: "audio", model: "google.gemma-4-e2b", summary: "", visibleText: "", uncertainties: [], start: 0, end: 120, duration: 200, nextStart: 120, segments: [{ start: 0, end: 30, text: "The screening starts at seven." }] };
  const html = renderToStaticMarkup(createElement(AudienceMapProvider, { value: actions }, createElement(MediaAnalysisCard, { analysis, onOpen() {} })));
  assert.ok(html.includes("The screening starts at seven."));
  assert.ok(html.includes("Continue transcript"));
  assert.ok(html.includes("0:00–2:00"));
  assert.ok(html.includes("not individual words"));
  assert.ok(html.includes("Open media"));
});

test('video analysis exposes the complete speech transcript alongside visual samples',async()=>{
 const {default:MediaAnalysisCard}=await import('../app/components/research/MediaAnalysisCard.tsx');
 const transcript={model:'google.gemma-4-e2b',start:0,end:130,duration:130,complete:true,uncertainties:[],segments:[{start:120,end:130,text:'Compare energy costs before buying hardware.'}]};
 const analysis={kind:'media',fileId:'v',name:'Video.mp4',modality:'video',model:'google.gemma-4-26b-a4b',summary:'A hardware review.',visibleText:'',uncertainties:[],duration:130,start:0,end:130,hasAudio:true,transcript,segments:[{start:5,text:'A computer.'}]};
 const html=renderToStaticMarkup(createElement(AudienceMapProvider,{value:actions},createElement(MediaAnalysisCard,{analysis})));
 assert.ok(html.includes('Compare energy costs'));
 assert.ok(html.includes('full audio track'));
 assert.ok(html.includes('0:00–2:10'));
 assert.ok(html.includes('google.gemma-4-e2b'));
 assert.ok(!html.includes('Audio was not transcribed'));
});

test('venue carousel keeps map ordering, focus and query affinity without inventing percentages',async()=>{
 const{default:VenueCarousel}=await import('../app/components/locations/VenueCarousel.tsx');
 const html=renderToStaticMarkup(createElement(VenueCarousel,{scene:{id:'scene',presentation:{locations:[{...place,affinity:.73},{...place,id:'b',name:'Second venue'}],focusIndex:0}},onScene:()=>true}));
 assert.ok(html.includes('aria-label="Venue shortlist"'));assert.ok(html.includes('aria-pressed="true"'));assert.ok(html.includes('Qloo venue affinity'));assert.ok(html.includes('0.73'));assert.equal(html.includes('73%'),false);assert.ok(html.indexOf('Cinema')<html.indexOf('Second venue'));
 assert.equal(renderToStaticMarkup(createElement(VenueCarousel,{onScene:()=>true})), '');
});
