import { tool } from "ai";
import { z } from "zod";
import { locationInterestSchema } from "../lib/locationInterest";
import { ApiError } from "../server/http";
import { audienceVenues } from "../server/audience-venues";

export const searchAudienceVenues = tool({
  description: "Find real cinemas, performing arts theatres, live music venues or concert halls in the selected area. Use the user's map area and venueTypes filters from context. Optionally supply Qloo entity IDs resolved by searchEntities or genre tag IDs from searchAudienceTags to rank venue affinity for a film, artist or brand. Without entity or tag IDs these are geographic venue results, not a measured taste match. The returned venue widget updates the map automatically; do not duplicate it with showMapLocations. Never claim ticket availability, capacity, audience counts or bookings.",
  inputSchema: z.object({ area: locationInterestSchema, entityIds: z.array(z.uuid()).default([]), tagIds: z.array(z.string().startsWith("urn:tag:")).default([]) }),
  execute: async ({ area, entityIds, tagIds }, { abortSignal }) => {
    try {
      const result = await audienceVenues(area, entityIds, abortSignal, tagIds);
      return { kind: "venues" as const, source: "Qloo" as const, basis: entityIds.length || tagIds.length ? "taste" as const : "geographic" as const, area, venues: result.locations };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return { kind: "venues" as const, source: "Qloo" as const, basis: entityIds.length || tagIds.length ? "taste" as const : "geographic" as const, area, venues: [] };
      throw error;
    }
  },
  toModelOutput: ({ output }) => ({ type: "json", value: { ...output, interpretation: "These are Qloo place affinity results for the supplied signals. A venue's modeled cultural alignment does not establish its patrons' preferences, physical suitability, screening facilities or capacity. Use exact returned names and coordinates. Do not claim a heatmap failed or was empty unless getAudienceHeatmap actually ran and returned that outcome." } }),
});
