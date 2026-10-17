import "server-only";
import { z } from "zod";
import { areaBoundary, type LocationInterest } from "../lib/locationInterest";
import { populationWidgetSchema, type PopulationWidget } from "../lib/audienceWidget";
import { ApiError } from "./http";

async function request(path: string, init: RequestInit, signal?: AbortSignal) {
  const response = await fetch(`https://api.worldpop.org/v2/${path}`, { ...init, headers: { "Content-Type": "application/json", Accept: "application/json" }, cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
  if (!response.ok) throw new ApiError(502, `WorldPop request failed (${response.status}).`);
  return response.json() as Promise<unknown>;
}
export async function startPopulation(area: LocationInterest, analysis: "population" | "agesex", year: number, signal?: AbortSignal) {
  const response = z.object({ task_id: z.uuid() }).safeParse(await request(analysis, { method: "POST", body: JSON.stringify({
    geojson: areaBoundary(area).geometry, year, resolution: "1km", ...(analysis === "agesex" ? { age_range: [0, 90], sex: "both" } : {}),
  }) }, signal));
  if (!response.success) throw new ApiError(502, "WorldPop returned an invalid calculation job.");
  return populationWidgetSchema.parse({ kind: "population", source: "WorldPop", area, year, analysis, taskId: response.data.task_id, status: "pending" });
}
const statusSchema = z.object({
  status: z.enum(["pending", "started", "processing", "success", "failure"]), error: z.unknown().optional(),
  result: z.object({ total_population: z.number().nonnegative(), data_year: z.number(),
    agesex_pyramid: z.array(z.object({ age: z.string(), male: z.number().nonnegative(), female: z.number().nonnegative() })).optional(),
  }).nullish(),
});
export async function populationResult(widget: PopulationWidget, signal?: AbortSignal) {
  const parsed = statusSchema.safeParse(await request(`tasks/${widget.taskId}`, {}, signal));
  if (!parsed.success) throw new ApiError(502, "WorldPop returned invalid population data.");
  if (parsed.data.status === "failure") return populationWidgetSchema.parse({ ...widget, status: "failed", error: "WorldPop could not calculate this area. Try a smaller area." });
  if (parsed.data.status !== "success") return { ...widget, status: "pending" as const };
  if (!parsed.data.result) throw new ApiError(502, "WorldPop returned no population result.");
  if (parsed.data.result.data_year !== widget.year) throw new ApiError(502, "WorldPop returned a different data year than requested.");
  if (widget.analysis === "agesex" && !parsed.data.result.agesex_pyramid) throw new ApiError(502, "WorldPop returned no age and sex breakdown.");
  return populationWidgetSchema.parse({ ...widget, status: "ready", year: parsed.data.result.data_year, total: parsed.data.result.total_population,
    ...(parsed.data.result.agesex_pyramid ? { rows: parsed.data.result.agesex_pyramid } : {}),
  });
}
