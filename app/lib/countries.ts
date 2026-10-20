import data from "./countries.json" with { type: "json" };
export type Polygon = { type: "Polygon"; coordinates: number[][][] };
export type MultiPolygon = { type: "MultiPolygon"; coordinates: number[][][][] };

export interface Country {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  geometry: Polygon | MultiPolygon;
}

// Natural Earth Admin 0, public domain: 110m boundaries with 50m small countries.
export const countries = data as Country[];
export function countryByCode(code: string) {
  const country = countries.find((item) => item.code === code);
  if (!country) throw new Error("Choose a supported country.");
  return country;
}
export function countryAt(longitude: number, latitude: number) {
  return countries.find((country) => {
    const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
    function contains(ring: number[][]) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [x, y] = ring[i], [previousX, previousY] = ring[j];
        if ((y > latitude) !== (previousY > latitude) && longitude < (previousX - x) * (latitude - y) / (previousY - y) + x) inside = !inside;
      }
      return inside;
    }
    return polygons.some(([outer, ...holes]) => contains(outer) && !holes.some(contains));
  });
}
