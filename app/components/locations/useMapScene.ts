import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { LngLatBounds, Map } from "maplibre-gl";
import { audienceCamera } from "../../lib/audienceCamera";
import type { MapScene } from "../../lib/mapScene";

export function useMapScene(map: RefObject<Map | null>, ready: boolean, scene: MapScene | undefined, threeD: boolean, visible: boolean) {
  const applied = useRef<{ map: Map; key: string } | null>(null);
  const present = useEffectEvent((instance: Map, value: MapScene) => {
    const camera = audienceCamera(value);
    if (!camera || (!value.reframe && applied.current?.map === instance && applied.current.key === camera.key)) return;
    const { center, zoom, bounds } = camera;
    if (center) instance.flyTo({ center: [center.longitude, center.latitude], zoom: zoom ?? 14, pitch: threeD ? 55 : 0, duration: 1400 });
    else instance.fitBounds(new LngLatBounds([bounds[0], bounds[1]], [bounds[2], bounds[3]]), { padding: 80, maxZoom: zoom ?? 15, pitch: threeD ? 55 : 0, duration: 1400 });
    applied.current = { map: instance, key: camera.key };
  });
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !scene || !visible) return;
    present(instance, scene);
  }, [map, ready, scene?.id, visible]);
}
