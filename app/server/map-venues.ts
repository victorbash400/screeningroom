import "server-only";
import { z } from "zod";
import type { LocationInterest } from "../lib/locationInterest";
import { venueTypes, type VenueType } from "../lib/venueTypes";
import { publicWebUrl } from "../lib/similarResults";
import { venueResultsSchema } from "../lib/audienceWidget";
import { audienceVenues } from "./audience-venues";
import { ApiError } from "./http";

const categories: Partial<Record<VenueType, string>> = {
  cinema: "entertainment.cinema", theatre: "entertainment.culture.theatre",
};
const responseSchema = z.object({ features: z.array(z.object({ properties: z.object({
  place_id: z.string(), name: z.string(), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180),
  formatted: z.string().optional(), website: z.string().nullish(),
}) })) });
export async function mapVenues(area: LocationInterest, type: VenueType, signal?: AbortSignal) {
  const provider = process.env.VENUE_DATA_PROVIDER?.trim() || "qloo";
  if (provider === "qloo") {
    try {
      const result = await audienceVenues({ ...area, venueTypes: [type] }, [], signal);
      return venueResultsSchema.parse({ kind: "venues", source: "Qloo", basis: "geographic", area, venues: result.locations });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return venueResultsSchema.parse({ kind: "venues", source: "Qloo", basis: "geographic", area, venues: [] });
      throw error;
    }
  }
  if (provider !== "geoapify") throw new ApiError(503, "Configure VENUE_DATA_PROVIDER as qloo or geoapify.");
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  if (!key) throw new ApiError(503, "Add GEOAPIFY_API_KEY to use Geoapify venue search.");
  const category = categories[type];
  if (!category) throw new ApiError(400, "Use Qloo venue search for live music venues and concert halls; Geoapify has no matching category.");
  const url = new URL("https://api.geoapify.com/v2/places");
  url.search = new URLSearchParams({ categories: category, filter: area.countryCode ? `countrycode:${area.countryCode.toLowerCase()}` : `circle:${area.longitude},${area.latitude},${area.radius}`, bias: `proximity:${area.longitude},${area.latitude}`, limit: "40" }).toString();
  const response = await fetch(url, { headers: { "X-API-Key": key, Accept: "application/json" }, next: { revalidate: 3600 },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
  if (!response.ok) throw new ApiError(502, `Geoapify venue search failed (${response.status}).`);
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new ApiError(502, "Geoapify returned invalid venues.");
  const venues = parsed.data.features.map(({ properties: item }) => ({
    id: `geoapify:${item.place_id}`, name: item.name, latitude: item.lat, longitude: item.lon,
    ...(item.formatted ? { address: item.formatted } : {}), category: venueTypes.find((value) => value.id === type)!.label, source: "Geoapify" as const,
    ...(publicWebUrl.safeParse(item.website).success ? { website: item.website! } : {}),
  }));
  return venueResultsSchema.parse({ kind: "venues", source: "Geoapify", basis: "geographic", area, venues });
}

export async function mapVenueSearch(area: LocationInterest, signal?: AbortSignal) {
  if ((process.env.VENUE_DATA_PROVIDER?.trim() || "qloo") === "qloo") {
    const { locations } = await audienceVenues(area, [], signal);
    return { locations };
  }
  const types = area.venueTypes?.length ? area.venueTypes : ["cinema", "theatre"] as const;
  const results = await Promise.all(types.map((type) => mapVenues(area, type, signal)));
  const unique = new Map(results.flatMap((result) => result.venues).map((venue) => [venue.id, venue]));
  if (!unique.size) throw new ApiError(404, "No venues found. Change the area or filters.");
  return { locations: [...unique.values()] };
}
