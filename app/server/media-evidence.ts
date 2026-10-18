import "server-only";
import { z } from "zod";
import { qlooJson } from "../tools/qloo";
import { publicWebUrl } from "../lib/similarResults";
import { comparisonWidgetSchema, type ResearchMetric } from "../lib/researchWidget";
import { ApiError } from "./http";
import { compareMetrics } from "../lib/compareMetrics";

const rating = z.object({ id: z.string().nullish(), user_rating: z.number().nullish(), user_rating_count: z.number().nullish(), critic_rating: z.number().nullish() });
const entitySchema = z.object({ entity_id: z.string(), name: z.string(), popularity: z.number().min(0).max(1).nullish(), tags: z.array(z.object({ tag_id: z.string(), name: z.string() })).nullish(), properties: z.object({
  description: z.string().nullish(), website: z.string().nullish(), release_year: z.number().nullish(), image: z.object({ url: z.string().nullish() }).nullish(),
  external: z.object({ imdb: rating.nullish(), metacritic: rating.nullish() }).nullish(),
}).nullish() });
const responseSchema = z.object({ results: z.array(entitySchema) });
export async function mediaEvidence(entityIds: string[], title: string, signal?: AbortSignal) {
  const parsed = responseSchema.safeParse(await qlooJson("/entities", { entity_ids: [...new Set(entityIds)].join(",") }, signal));
  if (!parsed.success) throw new ApiError(502, "Qloo returned invalid media details.");
  if (entityIds.some((id) => !parsed.data.results.some((entity) => entity.entity_id.toLowerCase() === id.toLowerCase()))) throw new ApiError(404, "Some media references were not found in Qloo. Resolve the titles again.");
  const subjects = [...new Set(entityIds.map((id) => id.toLowerCase()))].map((id) => parsed.data.results.find((entity) => entity.entity_id.toLowerCase() === id)!).map((entity) => {
    const metrics: ResearchMetric[] = [];
    const add = (key: string, label: string, value: number | null | undefined, unit: ResearchMetric["unit"], source: string) => { if (value !== undefined && value !== null) metrics.push({ key, label, value, unit, source }); };
    add("imdbRating", "IMDb user rating", entity.properties?.external?.imdb?.user_rating, "rating10", "IMDb via Qloo");
    add("imdbVotes", "IMDb rating count", entity.properties?.external?.imdb?.user_rating_count, "count", "IMDb via Qloo");
    add("metacriticRating", "Metacritic critic rating", entity.properties?.external?.metacritic?.critic_rating, "rating100", "Metacritic via Qloo");
    add("metacriticUserRating", "Metacritic user rating", entity.properties?.external?.metacritic?.user_rating, "rating10", "Metacritic via Qloo");
    add("popularity", "Popularity index", entity.popularity, "index", "Qloo");
    const image = publicWebUrl.safeParse(entity.properties?.image?.url);
    const imdbId = entity.properties?.external?.imdb?.id;
    const imdbValid = imdbId?.startsWith("tt") && imdbId.length > 2 && [...imdbId.slice(2)].every((character) => character >= "0" && character <= "9");
    const website = publicWebUrl.safeParse(imdbValid ? `https://www.imdb.com/title/${imdbId}/` : entity.properties?.website);
    return { id: entity.entity_id, name: entity.name, ...(image.success ? { image: image.data } : {}), ...(website.success ? { website: website.data } : {}),
      ...(entity.properties?.description ? { description: entity.properties.description } : {}), ...(entity.properties?.release_year != null ? { year: entity.properties.release_year } : {}),
      tags: (entity.tags ?? []).map((tag) => tag.name), metrics };
  });
  const commonTags = subjects[0]?.tags.filter((tag) => subjects.every((subject) => subject.tags.includes(tag))) ?? [];
  return comparisonWidgetSchema.parse({ kind: "comparison", evidenceId: crypto.randomUUID(), title, source: "Qloo catalogue", retrievedAt: new Date().toISOString(), subjects, commonTags, metricComparisons: compareMetrics(subjects), basis: "Reception and reach proxies from Qloo: source-labelled ratings, rating counts and a 0–1 popularity index. Rating counts measure voting participation, not viewers. These are current catalogue snapshots, not release-window results. Revenue, budget, profit, views, retention and ticket sales are not supplied by this connection. Missing values stay absent. A metric gap is an observed difference, not statistical significance, a causal explanation or a forecast." });
}
