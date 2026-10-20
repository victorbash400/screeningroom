import { countryByCode } from "../lib/countries";
import { tool } from "ai";
import { z } from "zod";
import { qlooRequest } from "./qloo";
import { locationInterestSchema, type LocationInterest } from "../lib/locationInterest";
import { researchChartSchema, type ResearchChart } from "../lib/researchWidget";
import { ApiError } from "../server/http";

export function localTasteTool(selectedArea: LocationInterest | undefined, remember: (chart: ResearchChart) => ResearchChart) {
  return tool({
    description: "Discover movies, shows, artists, books, podcasts or games culturally aligned with the selected location, for comparison with the observed characteristics of the user’s work. Uses signal.location as a geographic taste signal, NOT filter.location on non-geographic media. Use getAudienceHeatmap for the geographic alignment of specific resolved works or tags. Do not claim these discovery results directly score an uploaded original. Returns a chart of Qloo's query-relative affinity, not historical consumption or probabilities. Compare items only within this query, not absolute scores from separate cities/queries. Location signal radius is deliberately unset so Qloo uses dynamic density discovery; map radius still bounds separate heatmap/venue searches. Use returned local works to explain connections to the selected original, not to claim Qloo directly scored its uploaded bytes.",
    inputSchema: z.object({ type: z.enum(["movie", "tv_show", "artist", "book", "podcast", "videogame"]), area: locationInterestSchema.optional(), take: z.number().int().min(1).max(100).default(8) }),
    execute: async ({ type, area = selectedArea, take }, { abortSignal }) => {
      if (!area) throw new ApiError(400, "Choose a location on the map.");
      const entities = await qlooRequest("/v2/insights", { "filter.type": `urn:entity:${type}`, ...(area.countryCode ? { "signal.location.query": countryByCode(area.countryCode).name } : { "signal.location": `POINT(${area.longitude} ${area.latitude})` }), take: String(take) }, abortSignal);
      if (!entities.length) throw new ApiError(404, "Qloo returned no local taste results for this query.");
      const points = entities.map((entity) => {
        const query = z.object({ affinity: z.number().finite() }).safeParse(entity.query);
        if (!query.success) throw new ApiError(502, "Qloo local taste results are missing affinity values.");
        return { label: entity.name, value: query.data.affinity };
      });
      return remember(researchChartSchema.parse({ kind: "chart", evidenceId: crypto.randomUUID(), title: `${area.name} · local tastes`, source: "Qloo", unit: "index", view: "bar", basis: `${area.countryCode ? "Geographic taste signal for the selected country" : "Geographic taste signal at the selected point with Qloo dynamic density discovery"}. Values compare returned works within this query; they are not a percentage of residents, historical viewing/listening counts or calibrated probabilities of liking an uploaded work. Original-work alignment is interpreted from resolved comparables and observed characteristics, not a direct Qloo upload score.`, series: [{ name: "Local affinity", points }] }));
    },
  });
}
