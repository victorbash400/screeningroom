import { tool } from "ai";
import { z } from "zod";
import { locationInterestSchema } from "../lib/locationInterest";
import { audienceVenues } from "../server/audience-venues";

export const searchAudienceVenues = tool({
  description: "Find real cinemas, performing arts theatres, live music venues or concert halls in the selected area. Use the user's map area and venueTypes filters from context. Optionally supply Qloo entity IDs resolved by searchEntities to rank venue affinity for a film, artist or brand. Without entity IDs these are venue discovery results, not a measured audience match. Afterward call showMapLocations using the returned locations to display them. Never claim ticket availability, capacity, audience counts or bookings.",
  inputSchema: z.object({ area: locationInterestSchema, entityIds: z.array(z.uuid()).default([]) }),
  execute: ({ area, entityIds }, { abortSignal }) => audienceVenues(area, entityIds, abortSignal),
});
