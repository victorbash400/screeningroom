import { z } from "zod";
import { publicWebUrl } from "./similarResults.ts";

export const metricUnit = z.enum(["index", "rating10", "rating100", "count", "percent", "ratio", "amount"]);
export const researchMetric = z.object({ key: z.string().min(1), label: z.string().min(1), value: z.number().finite(), unit: metricUnit, source: z.string().min(1) }).strict();
export const evidenceSearchSchema = z.object({ endpoint: z.string(), cached: z.boolean().optional(), parameters: z.record(z.string(), z.string()), resultCount: z.number().int().nonnegative() }).strict();
export const researchSubject = z.object({ id: z.string().min(1), name: z.string().min(1), image: publicWebUrl.optional(), website: publicWebUrl.optional(), description: z.string().optional(), year: z.number().optional(), links: z.array(z.object({ label: z.string(), url: publicWebUrl }).strict()).optional(), contributors: z.array(z.object({ id: z.uuid(), score: z.number().min(0).max(1) }).strict()).optional(), tags: z.array(z.string()), metrics: z.array(researchMetric) }).strict();
export const metricComparison = z.object({ key: z.string(), label: z.string(), unit: metricUnit, source: z.string(), highest: z.array(z.string()), lowest: z.array(z.string()), minimum: z.number().finite(), maximum: z.number().finite(), gap: z.number().finite(), coverage: z.number().int().positive(), total: z.number().int().positive() }).strict();
export const comparisonWidgetSchema = z.object({ kind: z.literal("comparison"), subjectLabel: z.enum(["Media", "Platform"]).optional(), evidenceId: z.string().min(1), title: z.string().min(1), source: z.string().min(1), retrievedAt: z.iso.datetime(), subjects: z.array(researchSubject).min(1), searches: z.array(evidenceSearchSchema).optional(), commonTags: z.array(z.string()), basis: z.string().min(1), metricComparisons: z.array(metricComparison).optional() }).strict();
export const researchChartSchema = z.object({ kind: z.literal("chart"), evidenceId: z.string().min(1), title: z.string().min(1), source: z.string().min(1), unit: metricUnit, view: z.enum(["bar", "line"]), basis: z.string().min(1), series: z.array(z.object({ name: z.string().min(1), points: z.array(z.object({ label: z.string().min(1), value: z.number().finite() }).strict()).min(1) }).strict()).min(1) }).strict();
export const digitalAudienceSchema = z.object({ kind: z.literal("digital"), evidenceId: z.string(), title: z.string(), source: z.literal("Qloo"), retrievedAt: z.iso.datetime(), platforms: comparisonWidgetSchema.optional(), comparables: comparisonWidgetSchema.optional(), errors: z.array(z.object({ section: z.enum(["Platforms", "Comparables"]), message: z.string() }).strict()), basis: z.string() }).strict().refine((value) => Boolean(value.platforms || value.comparables), "Digital analysis needs returned evidence.");
export const researchWidgetSchema = z.discriminatedUnion("kind", [comparisonWidgetSchema, researchChartSchema, digitalAudienceSchema]);
export type ResearchWidget = z.infer<typeof researchWidgetSchema>;
export type ComparisonWidget = z.infer<typeof comparisonWidgetSchema>;
export type ResearchChart = z.infer<typeof researchChartSchema>;
export type ResearchMetric = z.infer<typeof researchMetric>;
export function metricText(value: number, unit: ResearchMetric["unit"]) {
  const text = value.toLocaleString(undefined, { maximumFractionDigits: unit === "count" ? 0 : unit === "index" ? 6 : 3 });
  return unit === "percent" ? `${text}%` : unit === "ratio" ? `${text}×` : unit === "rating10" ? `${text}/10` : unit === "rating100" ? `${text}/100` : text;
}
