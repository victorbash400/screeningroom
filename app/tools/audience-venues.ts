import { tool } from "ai";
import { z } from "zod";
import { locationInterestSchema } from "../lib/locationInterest";
import { ApiError } from "../server/http";
import { audienceVenues } from "../server/audience-venues";

export const searchAudienceVenues = tool({
  description: "Find real cinemas, performing arts theatres, live music venues or concert halls in the selected area. Use the user's map area and venueTypes filters from context. Optionally supply Qloo entity IDs resolved by searchEntities or genre tag IDs from searchAudienceTags to rank venue affinity for a film, artist or brand. Without entity IDs these are venue discovery results, not a measured audience match. Afterward call showMapLocations using the returned locations to display them. Never claim ticket availability, capacity, audience counts or bookings.",
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
});
