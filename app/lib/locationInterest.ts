import { z } from "zod";
import { venueTypeSchema } from "./venueTypes.ts";

export const locationInterestSchema = z.object({
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive(),
  venueTypes: z.array(venueTypeSchema).optional(),
}).strict();

export type LocationInterest = z.infer<typeof locationInterestSchema>;
export const defaultLocationInterest: LocationInterest = { name: "Nairobi", latitude: -1.2921, longitude: 36.8219, radius: 5_000 };

export function areaBoundary(area: LocationInterest) {
  const latitude = area.latitude * Math.PI / 180;
  const longitude = area.longitude * Math.PI / 180;
  const distance = area.radius / 6_371_000;
  const coordinates = Array.from({ length: 65 }, (_, index) => {
    const bearing = index * Math.PI / 32;
    const lat = Math.asin(Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing));
    const lon = longitude + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude), Math.cos(distance) - Math.sin(latitude) * Math.sin(lat));
    return [lon * 180 / Math.PI, lat * 180 / Math.PI];
  });
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [coordinates] } };
}
