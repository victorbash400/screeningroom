import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

export function cleanMapStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, layers: style.layers.filter((layer) => layer.type !== "raster").map((layer) => {
    const source = "source-layer" in layer ? layer["source-layer"] : undefined;
    if (layer.type === "symbol" && source === "poi" && layer.layout?.["icon-image"]) return { ...layer,
      layout: { ...layer.layout, "icon-image": ["match", ["get", "class"], ["atm", "recycling"], "", layer.layout["icon-image"] as string | ExpressionSpecification] },
      paint: { ...layer.paint, "text-color": "#43545f", "text-halo-color": "#ffffff", "text-halo-width": 1 },
    };
    if (layer.type === "background") return { ...layer, paint: { ...layer.paint, "background-color": "#f0f0eb" } };
    if (layer.type === "fill") {
      const color = source === "water" ? "#bcd5e3" : source === "building" ? "#d1d7db"
        : source === "park" || source === "landcover" ? "#dce7d9" : "#e9eae4";
      return { ...layer, paint: { ...layer.paint, "fill-color": color } };
    }
    if (layer.type === "fill-extrusion") return { ...layer, paint: { ...layer.paint, "fill-extrusion-color": "#cdd4d9", "fill-extrusion-opacity": 1 } };
    if (layer.type === "line" && source === "transportation") return { ...layer, paint: { ...layer.paint, "line-color": layer.id.endsWith("casing") ? "#b7c0c7" : "#ffffff" } };
    if (layer.type === "symbol" && layer.layout?.["text-field"]) return { ...layer, paint: { ...layer.paint, "text-color": "#43545f", "text-halo-color": "#ffffff", "text-halo-width": 1 } };
    return layer;
  }) };
}
