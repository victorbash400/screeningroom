import "server-only";
import { z } from "zod";
import { affinityQuerySchema } from "../lib/affinityEvidence";
import { qlooJson } from "../tools/qloo";

export async function affinityReferenceNames(queries: unknown[], signal?: AbortSignal) {
  const ids = [...new Set(queries.flatMap((query) => affinityQuerySchema.parse(query ?? {}).explainability?.["signal.interests.entities"]?.map((value) => value.entity_id) ?? []))];
  const names = new Map<string, string>();
  if (!ids.length) return names;
  const references = z.object({ results: z.array(z.object({ entity_id: z.uuid(), name: z.string() })) }).parse(await qlooJson("/entities", { entity_ids: ids.join(",") }, signal));
  for (const reference of references.results) names.set(reference.entity_id.toLowerCase(), reference.name);
  return names;
}
