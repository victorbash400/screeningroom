import { evidenceSearchSchema } from "./affinityEvidence.ts";
import { z } from "zod";
import { locationInterestSchema } from "./locationInterest.ts";
import { mapPlaceSchema } from "./mapScene.ts";
import { audienceHeatmapSchema } from "./audienceHeatmap.ts";

export const venueResultsSchema = z.object({
  kind: z.literal("venues"), searches: z.array(evidenceSearchSchema).optional(), basis: z.enum(["geographic", "taste"]).optional(), area: locationInterestSchema, source: z.enum(["Qloo", "OpenStreetMap", "Geoapify"]), venues: z.array(mapPlaceSchema),
}).strict();
const affinityBar = z.object({ label: z.string(), value: z.number().min(-1).max(1) }).strict();
export const audienceDemographicsSchema = z.object({
  kind: z.literal("demographics"), title: z.string().min(1), source: z.literal("Qloo"),
  profiles: z.array(z.object({ name: z.string(), age: z.array(affinityBar), gender: z.array(affinityBar) }).strict()),
}).strict();
export const populationWidgetSchema = z.object({
  kind: z.literal("population"), source: z.literal("WorldPop"), area: locationInterestSchema,
  year: z.number().int().min(2015).max(2030), analysis: z.enum(["population", "agesex"]), taskId: z.uuid(),
  status: z.enum(["pending", "ready", "failed"]), total: z.number().nonnegative().optional(), error: z.string().optional(),
  rows: z.array(z.object({ age: z.string(), male: z.number().nonnegative(), female: z.number().nonnegative() }).strict()).optional(),
}).strict()
  .refine((value) => value.status !== "ready" || value.total !== undefined, "A completed population result needs a total.")
  .refine((value) => value.status !== "ready" || value.analysis !== "agesex" || value.rows !== undefined, "Resident demographics need age and sex counts.")
  .refine((value) => value.status !== "failed" || Boolean(value.error), "A failed population calculation needs an error.");
export const audienceWidgetSchema = z.discriminatedUnion("kind", [venueResultsSchema, audienceHeatmapSchema, audienceDemographicsSchema, populationWidgetSchema]);
export type AudienceWidget = z.infer<typeof audienceWidgetSchema>;
export type VenueResults = z.infer<typeof venueResultsSchema>;
export type AudienceDemographics = z.infer<typeof audienceDemographicsSchema>;
export type PopulationWidget = z.infer<typeof populationWidgetSchema>;
