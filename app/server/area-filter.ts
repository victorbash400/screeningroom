import type { LocationInterest } from "../lib/locationInterest";
import { countryByCode } from "../lib/countries";

export function areaFilter(area: LocationInterest): Record<string, string> {
  if (!area.countryCode) return { "filter.location": `POINT(${area.longitude} ${area.latitude})`, "filter.location.radius": String(area.radius) };
  const geometry = countryByCode(area.countryCode).geometry;
  const ring = (points: number[][]) => `(${points.map((point) => point.join(" ")).join(",")})`;
  const polygon = (rings: number[][][]) => `(${rings.map(ring).join(",")})`;
  const location = geometry.type === "Polygon" ? `POLYGON${polygon(geometry.coordinates)}` : `MULTIPOLYGON(${geometry.coordinates.map(polygon).join(",")})`;
  return { "filter.location": location, "filter.location.radius": "0" };
}
