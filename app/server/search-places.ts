import "server-only";
import { z } from "zod";
import { ApiError } from "./http";

const responseSchema = z.object({ features: z.array(z.object({
  geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }),
  properties: z.object({ name: z.string().optional(), city: z.string().optional(), country: z.string().optional(), street: z.string().optional() }),
})) });

export async function searchPlaces(query: string, signal?: AbortSignal) {
  const url = new URL("https://photon.komoot.io/api/");
  url.search = new URLSearchParams({ q: query, limit: "6", lang: "en" }).toString();
  let response: Response;
  try { response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Screeningroom/0.1" },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000),
    next: { revalidate: 86400 },
  }); } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(502, "Place search unavailable. Try again.");
  }
  if (!response.ok) throw new ApiError(502, "Place search unavailable. Try again.");
  const data = responseSchema.parse(await response.json());
  return data.features.map(({ geometry, properties }) => ({
    name: properties.name || properties.street || query,
    detail: [properties.city, properties.country].filter(Boolean).join(", "),
    longitude: geometry.coordinates[0], latitude: geometry.coordinates[1],
  }));
}
