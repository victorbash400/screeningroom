import type { MapScene } from "./mapScene.ts";

export function audienceCamera(scene: MapScene) {
  const { locations, focusIndex, zoom, heatmap } = scene.presentation;
  const focus = focusIndex === undefined ? undefined : locations[focusIndex];
  const points = focus ? [focus] : heatmap?.cells.length ? heatmap.cells : locations;
  if (!points.length) return null;
  const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const point of points) {
    bounds[0] = Math.min(bounds[0], point.longitude);
    bounds[1] = Math.min(bounds[1], point.latitude);
    bounds[2] = Math.max(bounds[2], point.longitude);
    bounds[3] = Math.max(bounds[3], point.latitude);
  }
  const center = focus ?? (points.length === 1 ? points[0] : undefined);
  return { bounds, center, zoom, key: JSON.stringify([bounds, zoom, Boolean(center)]) };
}
