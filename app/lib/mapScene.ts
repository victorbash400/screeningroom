import { z } from "zod";

export const mapPlaceSchema = z.object({
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();
export const mapPresentationSchema = z.object({
  locations: z.array(mapPlaceSchema).min(1),
  focusIndex: z.number().int().nonnegative().optional(),
  zoom: z.number().min(0).max(22).optional(),
  threeD: z.boolean().optional(),
}).strict().refine((value) => value.focusIndex === undefined || value.focusIndex < value.locations.length, "Choose an existing map location.");
export const mapSceneSchema = z.object({ id: z.string(), presentation: mapPresentationSchema });
export type MapPlace = z.infer<typeof mapPlaceSchema>;
export type MapScene = z.infer<typeof mapSceneSchema>;
