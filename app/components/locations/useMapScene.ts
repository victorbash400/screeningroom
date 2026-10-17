import { useEffect, useEffectEvent, type RefObject } from "react";
import { LngLatBounds, Map, Marker } from "maplibre-gl";
import type { MapScene } from "../../lib/mapScene";
import type { LocationInterest } from "../../lib/locationInterest";
import styles from "./LocationMapCanvas.module.css";

export function useMapScene(map: RefObject<Map | null>, ready: boolean, scene: MapScene | undefined, onArea: (area: LocationInterest) => void, threeD: boolean, visible: boolean) {
  const select = useEffectEvent(onArea);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !scene || !visible) return;
    const { locations, focusIndex, zoom } = scene.presentation;
    const markers = locations.map((place) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = styles.resultPin;
      button.setAttribute("aria-label", `Select ${place.name}`);
      button.title = place.name;
      button.addEventListener("click", (event) => { event.stopPropagation(); select({ ...place, radius: 5_000 }); });
      return new Marker({ element: button }).setLngLat([place.longitude, place.latitude]).addTo(instance);
    });
    const focus = focusIndex === undefined ? locations.length === 1 ? locations[0] : undefined : locations[focusIndex];
    if (focus) instance.flyTo({ center: [focus.longitude, focus.latitude], zoom: zoom ?? 14, pitch: threeD ? 55 : 0, duration: 1400 });
    else {
      const bounds = new LngLatBounds();
      for (const place of locations) bounds.extend([place.longitude, place.latitude]);
      instance.fitBounds(bounds, { padding: 80, maxZoom: zoom ?? 15, pitch: threeD ? 55 : 0, duration: 1400 });
    }
    return () => { for (const marker of markers) marker.remove(); };
  }, [map, ready, scene?.id, visible]);
}
