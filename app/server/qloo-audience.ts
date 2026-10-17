import "server-only";
import { z } from "zod";
import { qlooJson } from "../tools/qloo";
import type { LocationInterest } from "../lib/locationInterest";
import { audienceDemographicsSchema } from "../lib/audienceWidget";
import { audienceHeatmapSchema } from "../lib/audienceHeatmap";
import { ApiError } from "./http";

export interface AudienceSignal { entityIds: string[]; tagIds: string[]; title: string }
function signalParameters(signal: AudienceSignal) {
  if (!signal.entityIds.length && !signal.tagIds.length) throw new ApiError(400, "Choose media or a genre for the audience analysis.");
  return { ...(signal.entityIds.length ? { "signal.interests.entities": signal.entityIds.join(",") } : {}), ...(signal.tagIds.length ? { "signal.interests.tags": signal.tagIds.join(",") } : {}) };
}
const heatmapResponse = z.object({ success: z.literal(true), results: z.object({ heatmap: z.array(z.object({
  location: z.object({ latitude: z.number(), longitude: z.number(), geohash: z.string() }),
  query: z.object({ affinity: z.number(), affinity_rank: z.number(), popularity: z.number() }),
})) }) });
export async function audienceHeatmap(area: LocationInterest, signal: AudienceSignal, abortSignal?: AbortSignal) {
  const response = heatmapResponse.safeParse(await qlooJson("/v2/insights", {
    "filter.type": "urn:heatmap", "filter.location": `POINT(${area.longitude} ${area.latitude})`, "filter.location.radius": String(area.radius), ...signalParameters(signal),
  }, abortSignal));
  if (!response.success) throw new ApiError(502, "Qloo returned invalid heatmap data.");
  return audienceHeatmapSchema.parse({ kind: "heatmap", title: signal.title, area, source: "Qloo", cells: response.data.results.heatmap.map(({ location, query }) => ({ ...location, affinity: query.affinity, rank: query.affinity_rank, popularity: query.popularity })) });
}
const demographicsResponse = z.object({ success: z.literal(true), results: z.object({ demographics: z.array(z.object({
  entity_id: z.string(), query: z.object({ age: z.record(z.string(), z.number()), gender: z.record(z.string(), z.number()) }),
})) }) });
const ageNames: Record<string, string> = { "24_and_younger": "24 and younger", "25_to_29": "25–29", "30_to_34": "30–34", "35_to_44": "35–44", "45_to_54": "45–54", "55_and_older": "55 and older" };
export async function audienceDemographics(signal: AudienceSignal, abortSignal?: AbortSignal, referenceNames?: ReadonlyMap<string, string>) {
  const response = demographicsResponse.safeParse(await qlooJson("/v2/insights", { "filter.type": "urn:demographics", ...signalParameters(signal) }, abortSignal));
  if (!response.success) throw new ApiError(502, "Qloo returned invalid demographic data.");
  return audienceDemographicsSchema.parse({ kind: "demographics", title: signal.title, source: "Qloo", profiles: response.data.results.demographics.map((item, index) => ({
    name: referenceNames?.get(item.entity_id) ?? (response.data.results.demographics.length === 1 ? signal.title : `Audience ${index + 1}`),
    age: Object.entries(item.query.age).map(([label, value]) => ({ label: ageNames[label] ?? label.split("_").join(" "), value })),
    gender: Object.entries(item.query.gender).map(([label, value]) => ({ label: label === "male" ? "Male" : label === "female" ? "Female" : label, value })),
  })) });
}
