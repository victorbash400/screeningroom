import { tool } from "ai";
import { z } from "zod";
import { mapPlaceSchema } from "../lib/mapScene";
import { searchPlaces } from "../server/search-places";

export const searchMapPlaces = tool({
  description: "Find real map coordinates for named cities, addresses, venues or landmarks. Use this to resolve names before showing them on the map. Results are geographic matches, not taste rankings. Never invent coordinates.",
  inputSchema: z.object({ query: z.string().trim().min(1).max(200) }),
  execute: ({ query }, { abortSignal }) => searchPlaces(query, abortSignal),
});

export const showMapLocations = tool({
  description: "Place locations on the user's map and animate its camera to them. Only use exact coordinates from searchMapPlaces, Qloo tool results, or the user's selected map area. Include all locations to display. Optionally focus one by its zero-based index and set zoom (city 11, neighborhood 14, building 16). Set threeD true for a tilted 3D building view or false for 2D. Never claim a 3D change without setting threeD. Calling this again updates the map. Do not imply booking availability or performance data.",
  inputSchema: z.object({
    locations: z.array(mapPlaceSchema).min(1), focusIndex: z.number().int().nonnegative().optional(),
    zoom: z.number().min(0).max(22).optional(), threeD: z.boolean().optional(),
  }).strict().refine((value) => value.focusIndex === undefined || value.focusIndex < value.locations.length, "Choose an existing map location."),
  execute: async (presentation) => presentation,
});
