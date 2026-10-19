import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { LngLatBounds, Map } from "maplibre-gl";
import { audienceCamera } from "../../lib/audienceCamera";
import type { MapScene } from "../../lib/mapScene";

export function useMapScene(map: RefObject<Map | null>, ready: boolean, scene: MapScene | undefined, threeD: boolean, visible: boolean, animate = true) {
  const applied = useRef<{ map: Map; key: string } | null>(null);
  const present = useEffectEvent((instance: Map, value: MapScene) => {
    const camera = audienceCamera(value);
    if (!camera || (!value.reframe && applied.current?.map === instance && applied.current.key === camera.key)) return;
    const { center, zoom, bounds } = camera;
    const container = instance.getContainer();
    const overlayHeight = container.closest('[aria-label="Audience map"]')?.querySelector('[aria-roledescription="carousel"]')?.getBoundingClientRect().height ?? 0;
    const horizontal = Math.min(40, container.clientWidth * .08);
    const padding = { top: Math.min(32, container.clientHeight * .08), left: horizontal, right: horizontal, bottom: Math.min(overlayHeight + 24, container.clientHeight * .6) };
    if (center) instance.flyTo({ center: [center.longitude, center.latitude], zoom: zoom ?? 14, padding, pitch: threeD ? 55 : 0, duration: animate ? 1400 : 0 });
    else instance.fitBounds(new LngLatBounds([bounds[0], bounds[1]], [bounds[2], bounds[3]]), { padding, maxZoom: zoom ?? 15, pitch: threeD ? 55 : 0, duration: animate ? 1400 : 0 });
    applied.current = { map: instance, key: camera.key };
  });
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !scene || !visible) return;
    present(instance, scene);
  }, [map, ready, scene?.id, visible]);
}
