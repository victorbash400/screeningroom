import { tool } from "ai";
import { z } from "zod";
import { locationInterestSchema } from "../lib/locationInterest";
import { ApiError } from "../server/http";
import { audienceVenues } from "../server/audience-venues";

export const searchAudienceVenues = tool({
  description: "Find real cinemas, performing arts theatres, live music venues or concert halls in the selected area. Use the user's map area and venueTypes filters from context. Optionally supply Qloo entity IDs resolved by searchEntities or genre tag IDs from searchAudienceTags to rank venue affinity for a film, artist or brand. Without entity or tag IDs these are geographic venue results, not a measured taste match. Returns Qloo reference-contribution weights, distance, venue category and provider audience-profile text where available. Explain how the user’s observed media characteristics connect to its resolved comparable references, and how those references contributed to each place. Audience-profile text is provider description, not a measured survey of regulars. Use compareAudienceSignals to refine relationships among the comparable media references, not to claim measured patron behavior; media-versus-venue comparison tags were unavailable in live validation. The returned venue widget updates the map automatically; do not duplicate it with showMapLocations. Never claim ticket availability, capacity, audience counts or bookings.",
  inputSchema: z.object({ area: locationInterestSchema, entityIds: z.array(z.uuid()).default([]), tagIds: z.array(z.string().startsWith("urn:tag:")).default([]) }),
  execute: async ({ area, entityIds, tagIds }, { abortSignal }) => {
    try {
      const result = await audienceVenues(area, entityIds, abortSignal, tagIds);
      return { kind: "venues" as const, source: "Qloo" as const, basis: entityIds.length || tagIds.length ? "taste" as const : "geographic" as const, area, searches: result.searches, venues: result.locations };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return { kind: "venues" as const, source: "Qloo" as const, basis: entityIds.length || tagIds.length ? "taste" as const : "geographic" as const, area, venues: [] };
      throw error;
    }
  },
  toModelOutput: ({ output }) => ({ type: "json", value: { ...output, interpretation: "The inline widget and map already show the complete venue list. Answer in two concise connected paragraphs, without headings or repeating venue rows. Explain one useful reference influence using its returned name and raw 0–1 weight only; NEVER convert contribution weights or affinity indices to percentages. These explain reference influence, not the fraction of patrons who like the work. Provider audienceProfile text describes the venue; it does not confirm measured visitor demographics or regulars’ preferences. Distinguish the work’s observed facts from your interpretation of how its references relate. Do not claim physical suitability, screening facilities, capacity or curator preferences beyond returned descriptions. Use exact returned names and coordinates. Do not claim a heatmap failed or was empty unless getAudienceHeatmap actually ran and returned that outcome." } }),
});
