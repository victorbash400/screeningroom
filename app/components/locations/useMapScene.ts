import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { LngLatBounds, Map } from "maplibre-gl";
import type { MapScene } from "../../lib/mapScene";

export function useMapScene(map: RefObject<Map | null>, ready: boolean, scene: MapScene | undefined, threeD: boolean, visible: boolean) {
  const applied = useRef<{ map: Map; id: string } | null>(null);
  const present = useEffectEvent((instance: Map, value: MapScene) => {
    const { locations, focusIndex, zoom, heatmap } = value.presentation;
    const points = locations.length ? locations : heatmap?.cells ?? [];
    if (!points.length) return;
    const focus = focusIndex === undefined ? locations.length === 1 ? locations[0] : undefined : locations[focusIndex];
    if (focus) instance.flyTo({ center: [focus.longitude, focus.latitude], zoom: zoom ?? 14, pitch: threeD ? 55 : 0, duration: 1400 });
    else {
      const bounds = new LngLatBounds();
      for (const place of points) bounds.extend([place.longitude, place.latitude]);
      instance.fitBounds(bounds, { padding: 80, maxZoom: zoom ?? 15, pitch: threeD ? 55 : 0, duration: 1400 });
    }
  });
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !scene || !visible || (applied.current?.map === instance && applied.current.id === scene.id)) return;
    present(instance, scene);
    applied.current = { map: instance, id: scene.id };
  }, [map, ready, scene?.id, visible]);
}
