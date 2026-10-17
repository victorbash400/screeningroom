import "server-only";
import { qlooRequest } from "../tools/qloo";
import type { LocationInterest } from "../lib/locationInterest";
import { venueTypes } from "../lib/venueTypes";
import { ApiError } from "./http";

export async function audienceVenues(area: LocationInterest, entityIds: string[] = [], signal?: AbortSignal) {
  const filters = area.venueTypes ?? [];
  const selected = filters.length ? venueTypes.filter((item) => filters.includes(item.id)) : venueTypes;
  const result = await qlooRequest("/v2/insights", {
    "filter.type": "urn:entity:place", "filter.location": `POINT(${area.longitude} ${area.latitude})`,
    "filter.location.radius": String(area.radius), "filter.tags": selected.map((item) => item.tag).join(","),
    "operator.filter.tags": "union", take: "20",
    ...(entityIds.length ? { "signal.interests.entities": entityIds.join(",") } : {}),
  }, signal);
  if (!result.length) throw new ApiError(404, "No venues found. Change the area or filters.");
  const locations = result.flatMap((item) => item.location ? [{ name: item.name, latitude: item.location.lat, longitude: item.location.lon }] : []);
  if (!locations.length) throw new ApiError(502, "Venue results have no map coordinates.");
  return { locations };
}
