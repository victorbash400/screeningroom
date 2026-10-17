import { useEffect, useEffectEvent, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Map, Marker, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { areaBoundary, type LocationInterest } from "../../lib/locationInterest";
import LocationMapOptions from "./LocationMapOptions";
import { useCurrentLocation } from "./useCurrentLocation";
import MapAttribution from "./MapAttribution";
import styles from "./LocationMapCanvas.module.css";
import { cleanMapStyle } from "./mapStyle";
import { useMapScene } from "./useMapScene";
import type { MapScene } from "../../lib/mapScene";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

export default function LocationMapCanvas({ area, landmarks, threeD, scene, visible, onArea, onLandmarks, onThreeD }: {
  onLandmarks: (enabled: boolean) => void;
  onThreeD: (enabled: boolean) => void;
  visible: boolean;
  scene?: MapScene;
  area?: LocationInterest;
  landmarks: boolean;
  threeD: boolean;
  onArea: (area?: LocationInterest) => void;
}) {
  const deviceLocation = useCurrentLocation(area, onArea);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const select = useEffectEvent((longitude: number, latitude: number, name?: string) => onArea({
    longitude: ((longitude + 180) % 360 + 360) % 360 - 180, latitude,
    name: name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, radius: area?.radius ?? 5_000, venueTypes: area?.venueTypes,
  }));
  const initialArea = useRef(area);
  useEffect(() => {
    if (!container.current) return;
    setReady(false); setError(false);
    let instance: Map;
    try {
      instance = new Map({
        container: container.current,
        center: initialArea.current ? [initialArea.current.longitude, initialArea.current.latitude] : [0, 20],
        zoom: initialArea.current ? 11 : 1.5,
        attributionControl: false,
      });
    } catch { setError(true); return; }
    map.current = instance;
    instance.on("error", () => setError(true));
    instance.on("load", () => {
      instance.addSource("interest", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      const color = getComputedStyle(container.current!).getPropertyValue("--accent").trim();
      instance.addLayer({ id: "interest-fill", type: "fill", source: "interest", paint: { "fill-color": color, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.07, 15, 0] } });
      instance.addLayer({ id: "interest-edge", type: "line", source: "interest", paint: { "line-color": color, "line-width": 1.5 } });
      instance.setLayerZoomRange("building", 13, 24);
      setReady(true); setError(false);
    });
    instance.setStyle("https://tiles.openfreemap.org/styles/liberty", { transformStyle: (_, style) => cleanMapStyle(style) });
    instance.on("click", (event) => {
      const feature = instance.queryRenderedFeatures(event.point).find((item) => item.sourceLayer === "poi" && typeof item.properties?.name === "string");
      select(event.lngLat.lng, event.lngLat.lat, feature?.properties?.name);
    });
    let width = 0, height = 0;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect;
      if (!next.width || !next.height || (next.width === width && next.height === height)) return;
      width = next.width; height = next.height;
      instance.resize();
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); marker.current?.remove(); marker.current = null; instance.remove(); map.current = null; };
  }, [attempt]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    for (const layer of instance.getStyle().layers) {
      if ("source-layer" in layer && layer["source-layer"] === "poi")
        instance.setLayoutProperty(layer.id, "visibility", landmarks ? "visible" : "none");
    }
  }, [ready, landmarks]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    instance.setLayoutProperty("building-3d", "visibility", threeD ? "visible" : "none");
    instance.setLayoutProperty("building", "visibility", threeD ? "none" : "visible");
    if (threeD) { instance.dragRotate.enable(); instance.touchPitch.enable(); }
    else { instance.dragRotate.disable(); instance.touchPitch.disable(); }
    instance.easeTo({ pitch: threeD ? 55 : 0, bearing: threeD ? instance.getBearing() : 0, duration: 400 });
  }, [ready, threeD]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const source = instance.getSource<GeoJSONSource>("interest");
    source?.setData(area ? areaBoundary(area) : { type: "FeatureCollection", features: [] });
    if (area) {
      if (!marker.current) {
        const element = document.createElement("div");
        element.className = styles.pin;
        marker.current = new Marker({ element }).setLngLat([area.longitude, area.latitude]).addTo(instance);
      }
      marker.current.getElement().setAttribute("aria-label", area.name);
      marker.current.setLngLat([area.longitude, area.latitude]);
    } else { marker.current?.remove(); marker.current = null; }
  }, [ready, area?.name, area?.latitude, area?.longitude, area?.radius]);
  useEffect(() => {
    if (!visible) map.current?.stop();
    else map.current?.resize();
  }, [visible]);
  useEffect(() => {
    if (ready && area) map.current?.easeTo({ center: [area.longitude, area.latitude], zoom: Math.max(map.current.getZoom(), 11), duration: 450 });
  }, [ready, area?.latitude, area?.longitude]);

  useMapScene(map, ready, scene, (value) => onArea({ ...value, radius: area?.radius ?? value.radius, venueTypes: area?.venueTypes }), threeD, visible);
  return <div className={styles.canvas}>
    <div className={styles.map} ref={container} aria-label="Interactive location map" />
    {!ready && !error && <LoaderCircle className={styles.loading} aria-label="Loading map" />}
    {(error || deviceLocation.error) && <div className={styles.error} role="alert"><span>{error ? "Map could not load." : deviceLocation.error}</span><button type="button" onClick={() => { if (error) setAttempt((value) => value + 1); else deviceLocation.locate(); }} disabled={deviceLocation.busy}>Retry</button></div>}
    <LocationMapOptions area={area} onArea={onArea} landmarks={landmarks} threeD={threeD} onLandmarks={onLandmarks} onThreeD={onThreeD}
      onZoomIn={() => map.current?.zoomIn()} onZoomOut={() => map.current?.zoomOut()}
      onCurrentLocation={deviceLocation.locate} locating={deviceLocation.busy} />
    <MapAttribution />
  </div>;
}
