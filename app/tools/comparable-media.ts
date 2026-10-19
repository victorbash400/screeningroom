import { tool } from "ai";
import { z } from "zod";
import { qlooRequest } from "./qloo";
import { mediaEvidence } from "../server/media-evidence";
import { compareMetrics } from "../lib/compareMetrics";
import { comparisonWidgetSchema, type ComparisonWidget } from "../lib/researchWidget";
import { ApiError } from "../server/http";
import { performanceOutput } from "./performance-output";

const matchSignal = z.object({ affinity: z.number().finite().optional(), explainability: z.object({ "signal.interests.entities": z.array(z.object({ entity_id: z.uuid(), score: z.number().min(0).max(1) })).optional() }).optional() });
export function comparableMediaTool(remember: (widget: ComparisonWidget) => ComparisonWidget) {
  return tool({
    description: "Find actual comparable media AND their performance evidence in one lookup. Use resolved title IDs, genuine Qloo tag IDs from searchAudienceTags, or both. For an uploaded original, inspect only enough to identify format/subject and resolve relevant taste tags; do not invent a catalogue identity. Use requiredTagIds for mandatory genre/format constraints, such as documentary; tagIds alone influence taste but do not restrict genre. Release-year bounds restrict the cohort. Returns linked titles with posters, Qloo taste affinity, popularity, IMDb ratings/vote counts, Metacritic ratings where available, and exact same-source metric comparisons. Results stay in Qloo recommendation order. Affinity selects comparables; it is not performance. No YouTube views, revenue, box office, retention or predictions are available. Automatically renders the performance table; do not stop at a description of the user's file.",
    inputSchema: z.object({ type: z.enum(["movie", "tv_show", "podcast", "book", "artist", "videogame"]), entityIds: z.array(z.uuid()).default([]), tagIds: z.array(z.string().startsWith("urn:tag:")).default([]), requiredTagIds: z.array(z.string().startsWith("urn:tag:")).default([]), take: z.number().int().min(1).max(100).default(5), minimumYear: z.number().int().optional(), maximumYear: z.number().int().optional() }).refine((value) => value.entityIds.length + value.tagIds.length > 0, "Resolve at least one title or taste tag.").refine((value) => value.minimumYear === undefined || value.maximumYear === undefined || value.minimumYear <= value.maximumYear, "Choose an ordered release-year range."),
    execute: async ({ type, entityIds, tagIds, requiredTagIds = [], take, minimumYear, maximumYear }, { abortSignal }) => {
      if ((minimumYear !== undefined || maximumYear !== undefined) && !["movie", "tv_show", "book"].includes(type)) throw new ApiError(400, "Year filters are supported for films, shows and books.");
      const yearParameter = type === "book" ? "filter.publication_year" : "filter.release_year";
      const parameters = { "feature.explainability": "true", "filter.type": `urn:entity:${type}`, ...(requiredTagIds.length ? { "filter.tags": requiredTagIds.join(","), "operator.filter.tags": "intersection" } : {}), ...(entityIds.length ? { "signal.interests.entities": entityIds.join(","), "filter.exclude.entities": entityIds.join(",") } : {}), ...(tagIds.length ? { "signal.interests.tags": tagIds.join(",") } : {}), ...(minimumYear === undefined ? {} : { [`${yearParameter}.min`]: String(minimumYear) }), ...(maximumYear === undefined ? {} : { [`${yearParameter}.max`]: String(maximumYear) }), take: String(take) };
      const matches = await qlooRequest("/v2/insights", parameters, abortSignal);
      const references = new Set(entityIds.map((id) => id.toLowerCase()));
      const ids = [...new Set(matches.map((match) => match.entity_id).filter((id) => !references.has(id.toLowerCase())))];
      if (!ids.length) throw new ApiError(404, "Qloo found no comparable media for these references or filters.");
      const evidence = await mediaEvidence(ids, "Similar media · performance", abortSignal);
      const subjects = evidence.subjects.map((subject) => {
        const match = matches.find((match) => match.entity_id.toLowerCase() === subject.id.toLowerCase());
        const query = match?.query;
        const signal = query === undefined || query === null ? undefined : matchSignal.parse(query);
        const links = (match?.external?.netflix ?? []).filter((item) => item.id.length > 0 && [...item.id].every((character) => character >= "0" && character <= "9")).map((item) => ({ label: "Netflix", url: `https://www.netflix.com/title/${item.id}` }));
        const contributors = signal?.explainability?.["signal.interests.entities"]?.map((item) => ({ id: item.entity_id, score: item.score }));
        return { ...subject, ...(links.length ? { links } : {}), ...(contributors ? { contributors } : {}), metrics: [...subject.metrics, ...(signal?.affinity === undefined ? [] : [{ key: "affinity", label: "Taste affinity", value: signal.affinity, unit: "index" as const, source: "Qloo recommendation query" }])] };
      });
      return remember(comparisonWidgetSchema.parse({ ...evidence, title: "Comparable works · reception", searches: [{ endpoint: "/v2/insights", parameters, resultCount: matches.length }, { endpoint: "/entities", parameters: { entity_ids: ids.join(",") }, resultCount: evidence.subjects.length }], subjects, metricComparisons: compareMetrics(subjects.map((subject) => ({ ...subject, metrics: subject.metrics.filter((metric) => metric.key !== "affinity") }))), basis: `Matches selected by Qloo taste affinity from the supplied references and tags, not visual similarity. Affinity is query-specific and must not be ranked as performance. ${evidence.basis}` }));
    },
    toModelOutput: ({ output }) => performanceOutput(output),
  });
}
