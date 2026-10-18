import "server-only";
import { z } from "zod";
import { publicWebUrl } from "../lib/similarResults";
import { qlooRequest } from "../tools/qloo";
import type { LocationInterest } from "../lib/locationInterest";
import { venueTypes } from "../lib/venueTypes";
import { ApiError } from "./http";

export async function audienceVenues(area: LocationInterest, entityIds: string[] = [], signal?: AbortSignal, tagIds: string[] = []) {
  const filters = area.venueTypes ?? [];
  const selected = filters.length ? venueTypes.filter((item) => filters.includes(item.id)) : venueTypes;
  const result = await qlooRequest("/v2/insights", {
    "filter.type": "urn:entity:place", "filter.location": `POINT(${area.longitude} ${area.latitude})`,
    "filter.location.radius": String(area.radius), "filter.tags": selected.map((item) => item.tag).join(","),
    "operator.filter.tags": "union", take: "20",
    ...(entityIds.length ? { "signal.interests.entities": entityIds.join(",") } : {}),
    ...(tagIds.length ? { "signal.interests.tags": tagIds.join(",") } : {}),
  }, signal);
  if (!result.length) throw new ApiError(404, "No venues found. Change the area or filters.");
  const locations = result.flatMap((item) => {
    if (!item.location) return [];
    const score = z.object({ affinity: z.number().optional() }).safeParse(item.query);
    return [{ id: item.entity_id, name: item.name, latitude: item.location.lat, longitude: item.location.lon,
      category: selected.length === 1 ? selected[0].label : "Venue", source: "Qloo" as const,
      ...(publicWebUrl.safeParse(item.properties?.image?.url).success ? { image: item.properties!.image!.url } : {}),
      ...(item.properties?.address ? { address: item.properties.address } : {}),
      ...(publicWebUrl.safeParse(item.properties?.website).success ? { website: item.properties!.website } : {}),
      ...((entityIds.length || tagIds.length) && score.success && score.data.affinity !== undefined ? { affinity: score.data.affinity } : {}),
    }];
  });
  if (!locations.length) throw new ApiError(502, "Venue results have no map coordinates.");
  return { locations };
}
