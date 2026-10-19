import { z } from "zod";
import { digitalPlatforms } from "./digitalPlatforms.ts";

export const toolTraceSchema = z.object({ input: z.record(z.string(), z.json()), matches: z.array(z.object({ id: z.string(), name: z.string() }).strict()).optional() }).strict();
export type ToolTrace = z.infer<typeof toolTraceSchema>;
const matchesSchema = z.array(z.object({ entity_id: z.string(), name: z.string() }));
export function captureToolTrace(input: unknown, output?: unknown): ToolTrace | undefined {
  const parsed = z.record(z.string(), z.json()).safeParse(input);
  if (!parsed.success) return undefined;
  const matches = matchesSchema.safeParse(output);
  return { input: parsed.data, ...(matches.success ? { matches: matches.data.map((item) => ({ id: item.entity_id, name: item.name })) } : {}) };
}
const labels: Record<string, string> = { query: "Search", type: "Media type", entityIds: "Comparable IDs", tagIds: "Interest tags", requiredTagIds: "Required tags", platformIds: "Platforms", take: "Requested results", title: "Analysis", fileId: "Selected file", groupBy: "Group by", area: "Search area", latitude: "Latitude", longitude: "Longitude", radius: "Radius (m)", venueTypes: "Venue types" };
export function toolInputRows(input: ToolTrace["input"], prefix = ""): { label: string; value: string }[] {
  return Object.entries(input).flatMap(([key, value]) => {
    const label = prefix + (labels[key] ?? key);
    if (Array.isArray(value)) return value.length ? [{ label, value: value.map((item) => key === "platformIds" && typeof item === "string" ? digitalPlatforms.find((platform) => platform.id === item)?.name ?? item : typeof item === "object" ? JSON.stringify(item) : String(item)).join(", ") }] : [];
    if (value !== null && typeof value === "object") return toolInputRows(value, `${label} · `);
    return [{ label, value: value === null ? "null" : String(value) }];
  });
}
