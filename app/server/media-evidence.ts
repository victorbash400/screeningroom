import "server-only";
import { z } from "zod";
import { qlooJson } from "../tools/qloo";
import { publicWebUrl } from "../lib/similarResults";
import { comparisonWidgetSchema, type ResearchMetric } from "../lib/researchWidget";
import { ApiError } from "./http";

const rating = z.object({ user_rating: z.number().nullish(), user_rating_count: z.number().nullish(), critic_rating: z.number().nullish() });
const entitySchema = z.object({ entity_id: z.string(), name: z.string(), popularity: z.number().min(0).max(1).nullish(), tags: z.array(z.object({ tag_id: z.string(), name: z.string() })).nullish(), properties: z.object({
  description: z.string().nullish(), release_year: z.number().nullish(), image: z.object({ url: z.string().nullish() }).nullish(),
  external: z.object({ imdb: rating.nullish(), metacritic: rating.nullish() }).nullish(),
}).nullish() });
const responseSchema = z.object({ results: z.array(entitySchema) });
export async function mediaEvidence(entityIds: string[], title: string, signal?: AbortSignal) {
  const parsed = responseSchema.safeParse(await qlooJson("/entities", { entity_ids: [...new Set(entityIds)].join(",") }, signal));
  if (!parsed.success) throw new ApiError(502, "Qloo returned invalid media details.");
  if (entityIds.some((id) => !parsed.data.results.some((entity) => entity.entity_id.toLowerCase() === id.toLowerCase()))) throw new ApiError(404, "Some media references were not found in Qloo. Resolve the titles again.");
  const subjects = parsed.data.results.map((entity) => {
    const metrics: ResearchMetric[] = [];
    const add = (key: string, label: string, value: number | null | undefined, unit: ResearchMetric["unit"], source: string) => { if (value !== undefined && value !== null) metrics.push({ key, label, value, unit, source }); };
    add("popularity", "Popularity index", entity.popularity, "index", "Qloo");
    add("imdbRating", "IMDb user rating", entity.properties?.external?.imdb?.user_rating, "rating10", "IMDb via Qloo");
    add("imdbVotes", "IMDb rating count", entity.properties?.external?.imdb?.user_rating_count, "count", "IMDb via Qloo");
    add("metacriticRating", "Metacritic critic rating", entity.properties?.external?.metacritic?.critic_rating, "rating100", "Metacritic via Qloo");
    const image = publicWebUrl.safeParse(entity.properties?.image?.url);
    return { id: entity.entity_id, name: entity.name, ...(image.success ? { image: image.data } : {}),
      ...(entity.properties?.description ? { description: entity.properties.description } : {}), ...(entity.properties?.release_year != null ? { year: entity.properties.release_year } : {}),
      tags: (entity.tags ?? []).map((tag) => tag.name), metrics };
  });
  const commonTags = subjects[0]?.tags.filter((tag) => subjects.every((subject) => subject.tags.includes(tag))) ?? [];
  return comparisonWidgetSchema.parse({ kind: "comparison", evidenceId: crypto.randomUUID(), title, source: "Qloo catalogue", retrievedAt: new Date().toISOString(), subjects, commonTags, basis: "Catalogue metadata and published ratings retrieved through Qloo. Qloo popularity uses a 0–1 index; it is not views, ticket sales, revenue, a percentage, or a prediction. Small differences do not establish a meaningful performance advantage. Ratings may have different collection dates." });
}
