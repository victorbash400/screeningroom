import "server-only";
import { affinityQuerySchema } from "../lib/affinityEvidence";
import { affinityReferenceNames } from "./affinity-references";
import { publicWebUrl } from "../lib/similarResults";
import { qlooRequest } from "../tools/qloo";
import type { LocationInterest } from "../lib/locationInterest";
import { venueTypes } from "../lib/venueTypes";
import { ApiError } from "./http";

export async function audienceVenues(area: LocationInterest, entityIds: string[] = [], signal?: AbortSignal, tagIds: string[] = []) {
  const filters = area.venueTypes ?? [];
  const selected = filters.length ? venueTypes.filter((item) => filters.includes(item.id)) : venueTypes;
  const parameters = { "feature.explainability": "true",
    "filter.type": "urn:entity:place", "filter.location": `POINT(${area.longitude} ${area.latitude})`,
    "filter.location.radius": String(area.radius), "filter.tags": selected.map((item) => item.tag).join(","),
    "operator.filter.tags": "union", take: "20",
    ...(entityIds.length ? { "signal.interests.entities": entityIds.join(",") } : {}),
    ...(tagIds.length ? { "signal.interests.tags": tagIds.join(",") } : {}),
  };
  const result = await qlooRequest("/v2/insights", parameters, signal);
  if (!result.length) throw new ApiError(404, "No venues found. Change the area or filters.");
  const names = await affinityReferenceNames(result.map((item) => item.query), signal);
  const locations = result.flatMap((item) => {
    if (!item.location) return [];
    const score = affinityQuerySchema.parse(item.query ?? {});
    const contributions = score.explainability?.["signal.interests.entities"]?.map((value) => ({ id: value.entity_id, score: value.score, ...(names.has(value.entity_id.toLowerCase()) ? { name: names.get(value.entity_id.toLowerCase()) } : {}) }));
    return [{ id: item.entity_id, name: item.name, latitude: item.location.lat, longitude: item.location.lon,
      category: item.properties?.primary_genre?.name ?? (selected.length === 1 ? selected[0].label : "Venue"), source: "Qloo" as const,
      ...(publicWebUrl.safeParse(item.properties?.image?.url).success ? { image: item.properties!.image!.url } : {}),
      ...(item.properties?.description ? { description: item.properties.description } : {}),
      ...(item.properties?.address ? { address: item.properties.address } : {}),
      ...(publicWebUrl.safeParse(item.properties?.website).success ? { website: item.properties!.website } : {}),
      ...(score.distance !== undefined ? { distanceMeters: score.distance } : {}),
      ...(contributions?.length ? { contributions } : {}),
      ...(item.properties?.customer_demographics_description ? { audienceProfile: item.properties.customer_demographics_description } : {}),
      ...((entityIds.length || tagIds.length) && score.affinity !== undefined ? { affinity: score.affinity } : {}),
    }];
  });
  if (!locations.length) throw new ApiError(502, "Venue results have no map coordinates.");
  return { locations, searches: [{ endpoint: "/v2/insights", parameters, resultCount: result.length }] };
}
