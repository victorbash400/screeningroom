import { tool } from "ai";
import { z } from "zod";
import { searchEntities } from "./search-entities";
import { qlooJson, qlooRequest } from "./qloo";
import { locationInterestSchema, type LocationInterest } from "../lib/locationInterest";
import { venueTypeSchema } from "../lib/venueTypes";
import { audienceDemographics, audienceHeatmap } from "../server/qloo-audience";
import { mapVenues } from "../server/map-venues";
import { populationWidgetSchema } from "../lib/audienceWidget";
import { startPopulation, populationResult } from "../server/population";
import { ApiError } from "../server/http";

const signals = z.object({ title: z.string().min(1), entityIds: z.array(z.uuid()).default([]), tagIds: z.array(z.string().startsWith("urn:tag:")).default([]) });
export function audienceTools(selectedArea?: LocationInterest) {
  let currentArea = selectedArea;
  const referenceNames = new Map<string, string>();
  function area(value?: LocationInterest) {
    if (value) return value;
    if (!currentArea) throw new ApiError(400, "Choose a location on the map first.");
    return currentArea;
  }
  return {
    searchEntities: tool({
      description: searchEntities.description,
      inputSchema: searchEntities.inputSchema,
      execute: async ({ query, type, take }, { abortSignal }) => {
        const entities = await qlooRequest("/search", { query, types: `urn:entity:${type}`, take: String(take) }, abortSignal);
        for (const entity of entities) referenceNames.set(entity.entity_id, entity.name);
        return entities;
      },
    }),
    setAudienceArea: tool({
      description: "Change the selected map search location, radius or venue filters. Set countryCode to a supported ISO alpha-2 code for a whole-country boundary instead of a radius; omit countryCode to return to radius mode. Only use when the user explicitly requests a change, including agreeing to expand the search. Never change the area just because a result is clicked or a search returns no data.",
      inputSchema: locationInterestSchema,
      execute: async (value) => { currentArea = value; return value; },
    }),
    loadPopulationResult: tool({
      description: "Load a previously returned WorldPop job once when the user explicitly asks for its result. Use the exact pending widget from conversation context. Do not invoke automatically after submitting, repeatedly check pending jobs, or poll. Automatically renders the returned population widget.",
      inputSchema: populationWidgetSchema,
      execute: (widget, { abortSignal }) => populationResult(widget, abortSignal),
    }),
    searchAudienceTags: tool({
      description: "Find real Qloo taste tag IDs for a genre or media topic, such as documentary or jazz. Use returned IDs as audience signals; never invent tags.",
      inputSchema: z.object({ query: z.string().trim().min(1) }),
      execute: async ({ query }, { abortSignal }) => {
        const parsed = z.object({ results: z.object({ tags: z.array(z.object({ id: z.string().startsWith("urn:tag:"), name: z.string() })) }) }).safeParse(await qlooJson("/v2/tags", { "filter.query": query }, abortSignal));
        if (!parsed.success) throw new ApiError(502, "Qloo returned invalid audience tags.");
        for (const tag of parsed.data.results.tags) referenceNames.set(tag.id, tag.name);
        return parsed.data.results.tags;
      },
    }),
    searchMapVenues: tool({
      description: "Find real physical venues from the configured geographic venue provider (Qloo discovery or Geoapify) in the selected map area. Choose cinema, theatre, live music or concert halls. If Geoapify is configured it supports cinemas/theatres; use searchAudienceVenues for live music/concert halls, not an unrelated category. Results include geographic facts, not measured audience affinity. Automatically displays a venue list and map pins. An empty list is a valid no-match result: ask before expanding the selected search area.",
      inputSchema: z.object({ type: venueTypeSchema, area: locationInterestSchema.optional() }),
      execute: ({ type, area: value }, { abortSignal }) => mapVenues(area(value), type, abortSignal),
      toModelOutput: ({ output }) => ({ type: "json", value: { ...output, resultCount: output.venues.length, renderedOnMap: true } }),
    }),
    getAudienceDemographics: tool({
      description: "Show Qloo age/gender audience-affinity charts for resolved media or taste tags. These are aggregate affinity indices, not percentages or the resident demographics of the selected map area. Automatically renders a chart. Use getAreaPopulation with analysis agesex for resident counts.",
      inputSchema: signals,
      execute: (signal, { abortSignal }) => audienceDemographics(signal, abortSignal, referenceNames),
    }),
    getAudienceHeatmap: tool({
      description: "Show a real Qloo geographic audience-affinity heatmap for media/tag signals in the selected map area. Automatically updates the map and adds an inline map link. Empty cells mean no coverage/results, never zero people. Ask whether to change or expand the area; do not expand it silently.",
      inputSchema: signals.extend({ area: locationInterestSchema.optional() }),
      execute: ({ area: value, ...signal }, { abortSignal }) => audienceHeatmap(area(value), signal, abortSignal),
      toModelOutput: ({ output }) => ({ type: "json", value: { title: output.title, area: output.area, source: output.source, cellCount: output.cells.length,
        strongestAreas: output.cells.toSorted((a, b) => b.rank - a.rank).slice(0, 8), renderedOnMap: output.cells.length > 0,
        interpretation: "These cells contain combined, query-relative affinity only. No per-reference contribution weights are provided. Do not claim one artist or comparable contributes more to this heatmap than another. Cell coordinates do not establish neighborhood names without separately verified location evidence. Affinity is not population, audience share or ticket sales." } }),
    }),
    getAreaPopulation: tool({
      description: "Request WorldPop resident population estimates or resident age-sex counts for the selected area. Specify a data year, default 2025. Returns a pending calculation widget with a Load result button; do not claim the result is already available or repeatedly check status. The user loads the result when ready. These are modeled resident estimates, not film fans, ticket buyers, or live footfall.",
      inputSchema: z.object({ area: locationInterestSchema.optional(), analysis: z.enum(["population", "agesex"]), year: z.number().int().min(2015).max(2030).default(2025) }),
      execute: ({ area: value, analysis, year }, { abortSignal }) => startPopulation(area(value), analysis, year, abortSignal),
    }),
  };
}
