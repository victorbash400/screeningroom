import { digitalPlatforms } from "../lib/digitalPlatforms";
import { tool } from "ai";
import { z } from "zod";
import { digitalAudienceSchema, type ComparisonWidget } from "../lib/researchWidget";
import { digitalPlatformFitTool } from "./digital-platforms";
import { comparableMediaTool } from "./comparable-media";
import { performanceOutput } from "./performance-output";
import { ApiError } from "../server/http";

export function digitalAudienceTool(remember: (widget: ComparisonWidget) => ComparisonWidget) {
  const platforms = digitalPlatformFitTool(remember);
  const comparables = comparableMediaTool(remember);
  return tool({
    description: "Analyze digital distribution audiences with real Qloo platform affinity AND comparable-work reception evidence in parallel. First understand the user's work and resolve comparable titles or supported taste tags. Choose relevant catalogue platform IDs and the comparable media type. Returns platform-brand affinity, linked comparable works, published ratings/counts/popularity where supplied, provider platform links and exact query provenance. Provider links identify catalogue records, not current territorial availability. These title-level metrics are NOT performance on Netflix/YouTube/Spotify. For actual platform-specific views or engagement, read a selected analytics CSV/JSON and use analyzeProjectPerformance grouped by platform. Explain useful evidence and missing coverage; do not claim views, subscribers or platform success from affinity. Partial provider failures are explicit in errors; do not silently replace them or rerun identical requests.",
    toModelOutput: ({ output }) => { const result = digitalAudienceSchema.parse(output); return { type: "json" as const, value: {
      title: result.title,
      platforms: result.platforms ? { evidenceId: result.platforms.evidenceId, subjects: result.platforms.subjects.map(({ name, website, metrics, contributors }) => ({ name, website, metrics, ...(contributors ? { contributors } : {}) })), basis: result.platforms.basis } : null,
      comparables: result.comparables ? performanceOutput(result.comparables).value : null,
      errors: result.errors,
      interpretation: "The widgets already show all values. Answer in two concise connected paragraphs, no headings or repeated metric lists. State the relevant measurement limitation once in a single sentence; do not stack repeated caveats. Interpret the relative platform ordering and one useful comparable reception difference. These brand-affinity scores do not establish platform reach, mainstream or arthouse audience composition, access, submission rules, subscriber tastes, or why a platform scored higher beyond its returned named reference contributions. These weights explain reference influence within this recommendation, not shares of subscribers. Do not invent a causal explanation for the score. No platform-specific performance was returned; say this briefly when performance was asked, and offer to analyze a platform analytics export. Title ratings are not a forecast for the user's work. IMDb vote counts do not measure reach. Link a returned comparable when useful. Do not recommend a target rating, invent availability or pretend platform distribution requirements were checked.",
    } }; },
    inputSchema: z.object({ title: z.string().trim().min(1), type: z.enum(["movie", "tv_show", "podcast", "book", "artist", "videogame"]), platformIds: z.array(z.string().refine((id) => digitalPlatforms.some((platform) => platform.id === id), "Unknown catalogue platform.")).min(1), entityIds: z.array(z.uuid()).default([]), tagIds: z.array(z.string().startsWith("urn:tag:")).default([]), requiredTagIds: z.array(z.string().startsWith("urn:tag:")).default([]), take: z.number().int().min(1).max(100).default(5) }).strict().refine((input) => input.entityIds.length + input.tagIds.length > 0, "Resolve comparable media or taste tags first."),
    execute: async (input, options) => {
      const platformInput = ({ title: "Platform affinity", platformIds: input.platformIds, entityIds: input.entityIds, tagIds: input.tagIds });
      const comparableInput = ({ type: input.type, entityIds: input.entityIds, tagIds: input.tagIds, requiredTagIds: input.requiredTagIds, take: input.take });
      const results = await Promise.allSettled([platforms.execute!(platformInput, options), comparables.execute!(comparableInput, options)]);
      options.abortSignal?.throwIfAborted();
      const errors = results.flatMap((result, index) => result.status === "rejected" ? [{ section: index === 0 ? "Platforms" as const : "Comparables" as const, message: result.reason instanceof Error ? result.reason.message : "Qloo analysis failed." }] : []);
      if (results.every((result) => result.status === "rejected")) throw new ApiError(502, errors.map((error) => `${error.section}: ${error.message}`).join(" "));
      return digitalAudienceSchema.parse({ kind: "digital", evidenceId: crypto.randomUUID(), title: input.title, source: "Qloo", retrievedAt: new Date().toISOString(),
        ...(results[0].status === "fulfilled" ? { platforms: results[0].value } : {}), ...(results[1].status === "fulfilled" ? { comparables: results[1].value } : {}), errors,
        basis: "Platform affinity and comparable-work reception are separate evidence. Comparable ratings and popularity apply to the title overall, not to its performance on a streaming service. Catalogue links do not verify current availability or distribution eligibility. Actual platform engagement comparisons require an analytics export with consistent metrics and reporting periods." });
    },
  });
}
