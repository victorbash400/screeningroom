import type { StyleSpecification } from "maplibre-gl";

export function cleanMapStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.filter((layer) => layer.type !== "raster").map((layer) => {
    const source = "source-layer" in layer ? layer["source-layer"] : undefined;
    if (layer.type === "background") return { ...layer, paint: { ...layer.paint, "background-color": "#f4f5f7" } };
    if (layer.type === "fill") {
      const color = source === "water" ? "#e0e8ed" : source === "building" ? "#e7e9ee"
        : source === "park" || source === "landcover" ? "#edf0ef" : "#f0f1f3";
      return { ...layer, paint: { ...layer.paint, "fill-color": color } };
    }
    if (layer.type === "fill-extrusion") return { ...layer, paint: { ...layer.paint, "fill-extrusion-color": "#eceef3", "fill-extrusion-opacity": 1 } };
    if (layer.type === "line" && source === "transportation") return { ...layer, paint: { ...layer.paint, "line-color": layer.id.endsWith("casing") ? "#e2e5e9" : "#ffffff" } };
    if (layer.type === "symbol" && layer.layout?.["text-field"]) return { ...layer, paint: { ...layer.paint, "text-color": "#7b8490", "text-halo-color": "#ffffff", "text-halo-width": 1 } };
    return layer;
  }) };
}
