import { tool } from "ai";
import { z } from "zod";
import { entityType, qlooRequest } from "./qloo";

export const tasteInsights = tool({
  description: "Get Qloo taste-affinity recommendations using entity IDs returned by searchEntities. These are affinities, never sales, conversion rates, rights clearance, or compliance decisions. For nearby places provide latitude, longitude and radius in meters together.",
  inputSchema: z.object({
    type: entityType,
    entityIds: z.array(z.uuid()).min(1).max(10),
    take: z.number().int().min(1).max(10).default(5),
    location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), radius: z.number().int().min(100).max(100_000) }).optional(),
  }),
  execute: ({ type, entityIds, take, location }, { abortSignal }) => qlooRequest("/v2/insights", {
    "filter.type": `urn:entity:${type}`, "signal.interests.entities": entityIds.join(","), take: String(take),
    ...(location ? { "filter.location": `POINT(${location.longitude} ${location.latitude})`, "filter.location.radius": String(location.radius) } : {}),
  }, abortSignal),
});
