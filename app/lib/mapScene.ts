import { contributionSchema } from "./affinityEvidence.ts";
import { z } from "zod";
import { publicWebUrl } from "./similarResults.ts";
import { audienceHeatmapSchema } from "./audienceHeatmap.ts";

export const mapPlaceSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  audienceProfile: z.string().optional(), distanceMeters: z.number().nonnegative().optional(), contributions: z.array(contributionSchema).optional(),
  category: z.string().optional(), address: z.string().optional(), website: publicWebUrl.optional(),
  image: publicWebUrl.optional(), affinity: z.number().optional(), source: z.enum(["Qloo", "OpenStreetMap", "Photon", "Geoapify"]).optional(),
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();
export const mapPresentationSchema = z.object({
  locations: z.array(mapPlaceSchema),
  heatmap: audienceHeatmapSchema.optional(),
  focusIndex: z.number().int().nonnegative().optional(),
  zoom: z.number().min(0).max(22).optional(),
  threeD: z.boolean().optional(),
}).strict().refine((value) => value.focusIndex === undefined || value.focusIndex < value.locations.length, "Choose an existing map location.");
export const mapSceneSchema = z.object({ id: z.string(), presentation: mapPresentationSchema, reframe: z.boolean().optional() });
export type MapPlace = z.infer<typeof mapPlaceSchema>;
export type MapScene = z.infer<typeof mapSceneSchema>;

export const mapContextSchema = z.object({ places: z.array(mapPlaceSchema), heatmapTitle: z.string().optional(), heatmapCellCount: z.number().int().nonnegative().optional() }).strict();
export function mapContext(scene?: MapScene) {
  if (!scene) return undefined;
  return { places: scene.presentation.locations, ...(scene.presentation.heatmap ? { heatmapTitle: scene.presentation.heatmap.title, heatmapCellCount: scene.presentation.heatmap.cells.length } : {}) };
}
