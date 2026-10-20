import { z } from "zod";
import { countries, countryByCode } from "./countries.ts";
import type { Polygon, MultiPolygon } from "./countries.ts";
import { venueTypeSchema } from "./venueTypes.ts";

export const locationInterestSchema = z.object({
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().finite().positive(),
  countryCode: z.string().refine((code) => countries.some((country) => country.code === code), "Choose a supported country.").optional(),
  venueTypes: z.array(venueTypeSchema).optional(),
}).strict();

export type LocationInterest = z.infer<typeof locationInterestSchema>;
export const defaultLocationInterest: LocationInterest = { name: "New York", latitude: 40.7128, longitude: -74.006, radius: 5_000 };

export function areaBoundary(area: LocationInterest): { type: "Feature"; properties: Record<string, never>; geometry: Polygon | MultiPolygon } {
  if (area.countryCode) return { type: "Feature", properties: {}, geometry: countryByCode(area.countryCode).geometry };
  if (area.radius >= Math.PI * 6_371_000) return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-180, -85.051129], [180, -85.051129], [180, 85.051129], [-180, 85.051129], [-180, -85.051129]]] } };
  const latitude = area.latitude * Math.PI / 180;
  const longitude = area.longitude * Math.PI / 180;
  const distance = area.radius / 6_371_000;
  let coordinates: number[][];
  if (distance > Math.PI / 2 || Math.abs(latitude) + distance >= Math.PI / 2) {
    const south = Math.max(-Math.PI / 2, latitude - distance);
    const north = Math.min(Math.PI / 2, latitude + distance);
    const edge = Array.from({ length: 129 }, (_, index) => {
      const lat = south + (north - south) * index / 128;
      const denominator = Math.cos(lat) * Math.cos(latitude);
      const numerator = Math.cos(distance) - Math.sin(lat) * Math.sin(latitude);
      const span = Math.abs(denominator) < 1e-12 ? numerator <= 0 ? Math.PI : 0 : Math.acos(Math.max(-1, Math.min(1, numerator / denominator)));
      return { latitude: lat * 180 / Math.PI, span: span * 180 / Math.PI };
    });
    coordinates = [...edge.map((point) => [area.longitude + point.span, point.latitude]), ...edge.toReversed().map((point) => [area.longitude - point.span, point.latitude])];
    coordinates.push(coordinates[0]);
  } else {
    coordinates = Array.from({ length: 65 }, (_, index) => {
      const bearing = index * Math.PI / 32;
      const lat = Math.asin(Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing));
      const lon = longitude + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude), Math.cos(distance) - Math.sin(latitude) * Math.sin(lat));
      return [lon * 180 / Math.PI, lat * 180 / Math.PI];
    });
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [coordinates] } };
}

export function areaBounds(area: LocationInterest): [number, number, number, number] {
  if (!area.countryCode) {
    const distance = Math.min(Math.PI, area.radius / 6_371_000);
    const latitude = area.latitude * Math.PI / 180;
    const south = Math.max(-Math.PI / 2, latitude - distance) * 180 / Math.PI;
    const north = Math.min(Math.PI / 2, latitude + distance) * 180 / Math.PI;
    const span = south <= -90 || north >= 90 ? 180 : Math.asin(Math.sin(distance) / Math.cos(latitude)) * 180 / Math.PI;
    return [area.longitude - span, Math.max(-85.051129, south), area.longitude + span, Math.min(85.051129, north)];
  }
  const geometry = countryByCode(area.countryCode).geometry;
  const points = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
  const longitudes = points.map(([longitude]) => (longitude + 360) % 360).sort((a, b) => a - b);
  let gap = -1, west = 0, east = 360;
  for (let i = 0; i < longitudes.length; i++) {
    const next = i + 1 === longitudes.length ? longitudes[0] + 360 : longitudes[i + 1];
    if (next - longitudes[i] > gap) { gap = next - longitudes[i]; west = next % 360; east = longitudes[i]; }
  }
  if (east < west) east += 360;
  if (west > 180) { west -= 360; east -= 360; }
  return [west, Math.max(-85.051129, Math.min(...points.map((point) => point[1]))), east, Math.min(85.051129, Math.max(...points.map((point) => point[1])))];
}

export function radiusArea(area: LocationInterest): LocationInterest {
  const { countryCode, ...circle } = area;
  return circle;
}
