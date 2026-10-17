import { tool } from "ai";
import { z } from "zod";
import { qlooJson } from "./qloo";
import { researchChartSchema } from "../lib/researchWidget";
import { ApiError } from "../server/http";

export const compareAudienceSignals = tool({
  description: "Ask Qloo's Analysis Compare endpoint for taste tags relating two groups of resolved media. Returns Qloo comparison scores for the returned tags. These scores are not a percentage of shared viewers, a winner, sales or visual similarity. Use compareMedia for source-labelled metadata and ratings. Name the compared groups in title and pass genuine resolved IDs.",
  inputSchema: z.object({ title: z.string().min(1), first: z.array(z.uuid()).min(1), second: z.array(z.uuid()).min(1) }).refine((value) => value.first.some((id) => !value.second.includes(id)) || value.second.some((id) => !value.first.includes(id)), "Choose different comparison groups."),
  execute: async ({ title, first, second }, { abortSignal }) => {
    const result = z.object({ results: z.object({ tags: z.array(z.object({ name: z.string(), query: z.object({ score: z.number().finite() }) })) }) }).safeParse(await qlooJson("/v2/analysis/compare", { "a.signal.interests.entities": first.join(","), "b.signal.interests.entities": second.join(",") }, abortSignal));
    if (!result.success) throw new ApiError(502, "Qloo returned invalid comparison data.");
    if (!result.data.results.tags.length) throw new ApiError(404, "Qloo returned no comparison tags for these references.");
    return researchChartSchema.parse({ kind: "chart", evidenceId: crypto.randomUUID(), title, source: "Qloo Analysis Compare", unit: "index", view: "bar", basis: "Qloo comparison scores for taste tags relating the two groups. They are query-specific indices, not shared-viewer percentages, evidence that one work is better, or performance forecasts.", series: [{ name: "Comparison score", points: result.data.results.tags.map((tag) => ({ label: tag.name, value: tag.query.score })) }] });
  },
});
