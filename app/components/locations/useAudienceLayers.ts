import { useEffect, useEffectEvent, type RefObject } from "react";
import { Map, type GeoJSONSource } from "maplibre-gl";
import type { MapScene, MapPlace } from "../../lib/mapScene";

export function useAudienceLayers(map: RefObject<Map | null>, ready: boolean, scene: MapScene | undefined, onSelect: (place: MapPlace) => void, onError: (message: string) => void) {
  const select = useEffectEvent(onSelect);
  const report = useEffectEvent(onError);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    instance.addSource("audience-venues", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 44 });
    instance.addLayer({ id: "audience-clusters", type: "circle", source: "audience-venues", filter: ["has", "point_count"], paint: { "circle-color": "#ffffff", "circle-radius": 18, "circle-stroke-color": "#8b969e", "circle-stroke-width": 1 } });
    instance.addLayer({ id: "audience-count", type: "symbol", source: "audience-venues", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#35434b" } });
    instance.addLayer({ id: "audience-venue", type: "circle", source: "audience-venues", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#5e7c88", "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
    instance.addSource("audience-heat", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    instance.addLayer({ id: "audience-heat", type: "heatmap", source: "audience-heat", paint: {
      "heatmap-weight": ["get", "rank"], "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 10, 14, 36], "heatmap-opacity": .6,
      "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(73,117,133,0)", .25, "#b5d4d8", .55, "#729ba9", .8, "#d7a18b", 1, "#b76650"],
    } }, "audience-clusters");
    const cluster = async (event: import("maplibre-gl").MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      try {
        const zoom = await instance.getSource<GeoJSONSource>("audience-venues")!.getClusterExpansionZoom(Number(feature.properties.cluster_id));
        if (map.current !== instance) return;
        instance.easeTo({ center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]], zoom, duration: 450 });
      } catch { report("Map cluster could not expand. Try zooming in."); }
    };
    const venue = (event: import("maplibre-gl").MapLayerMouseEvent) => {
      const index = event.features?.[0]?.properties.index;
      const place = typeof index === "number" ? currentPlaces(index) : undefined;
      if (place) select(place);
    };
    instance.on("click", "audience-clusters", cluster);
    instance.on("click", "audience-venue", venue);
    const enter = () => { instance.getCanvas().style.cursor = "pointer"; };
    const leave = () => { instance.getCanvas().style.cursor = ""; };
    for (const layer of ["audience-clusters", "audience-venue"]) { instance.on("mouseenter", layer, enter); instance.on("mouseleave", layer, leave); }
    return () => {
      if (map.current !== instance) return;
      instance.off("click", "audience-clusters", cluster); instance.off("click", "audience-venue", venue);
      for (const layer of ["audience-clusters", "audience-venue"]) { instance.off("mouseenter", layer, enter); instance.off("mouseleave", layer, leave); }
      for (const layer of ["audience-heat", "audience-venue", "audience-count", "audience-clusters"]) if (instance.getLayer(layer)) instance.removeLayer(layer);
      for (const source of ["audience-heat", "audience-venues"]) if (instance.getSource(source)) instance.removeSource(source);
    };
  }, [map, ready]);
  const currentPlaces = useEffectEvent((index: number) => scene?.presentation.locations[index]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    instance.getSource<GeoJSONSource>("audience-venues")?.setData({ type: "FeatureCollection", features: (scene?.presentation.locations ?? []).map((place, index) => ({ type: "Feature", properties: { index }, geometry: { type: "Point", coordinates: [place.longitude, place.latitude] } })) });
    instance.getSource<GeoJSONSource>("audience-heat")?.setData({ type: "FeatureCollection", features: (scene?.presentation.heatmap?.cells ?? []).map((cell) => ({ type: "Feature", properties: { rank: cell.rank }, geometry: { type: "Point", coordinates: [cell.longitude, cell.latitude] } })) });
  }, [map, ready, scene?.id]);
}
