import { z } from "zod";

export const mapHomeSchema = z.object({
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();
export const mapHomeResponseSchema = z.object({
  home: mapHomeSchema.nullable(),
  revision: z.number().int().nonnegative(),
}).strict();
export type MapHome = z.infer<typeof mapHomeSchema>;
