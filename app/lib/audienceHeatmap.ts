import { z } from "zod";
import { locationInterestSchema } from "./locationInterest.ts";

export const heatCellSchema = z.object({
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  geohash: z.string().min(1), affinity: z.number(), rank: z.number().min(0).max(1), popularity: z.number().min(0).max(1),
}).strict();
export const audienceHeatmapSchema = z.object({
  kind: z.literal("heatmap"), title: z.string().min(1), area: locationInterestSchema,
  cells: z.array(heatCellSchema), source: z.literal("Qloo"),
}).strict();
export type AudienceHeatmap = z.infer<typeof audienceHeatmapSchema>;
