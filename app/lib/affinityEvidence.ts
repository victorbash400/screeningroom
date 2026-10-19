import { z } from "zod";

export const contributionSchema = z.object({ id: z.uuid(), name: z.string().optional(), score: z.number().min(0).max(1) }).strict();
export const affinityQuerySchema = z.object({ affinity: z.number().finite().optional(), distance: z.number().nonnegative().optional(), explainability: z.object({
  "signal.interests.entities": z.array(z.object({ entity_id: z.uuid(), score: z.number().min(0).max(1) })).optional(), warning: z.string().optional(),
}).optional() });
export const evidenceSearchSchema = z.object({ endpoint: z.string(), cached: z.boolean().optional(), parameters: z.record(z.string(), z.string()), resultCount: z.number().int().nonnegative() }).strict();
