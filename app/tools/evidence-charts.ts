import { tool } from "ai";
import { z } from "zod";
import { researchChartSchema, type ComparisonWidget, type ResearchChart } from "../lib/researchWidget";
import { ApiError } from "../server/http";

export function evidenceCharts(loadEvidence?: (id: string) => Promise<ComparisonWidget | ResearchChart | undefined>) {
  const evidence = new Map<string, ComparisonWidget | ResearchChart>();
  function remember<T extends ComparisonWidget | ResearchChart>(widget: T): T { evidence.set(widget.evidenceId, widget); return widget; }
  const renderEvidenceChart = tool({
    description: "Render a bar or ordered line chart from verified results already returned in this turn. Supply the exact evidenceId and metric key from a tool result. Never invent numbers. For a line chart the source must already be ordered (for example date-grouped performance rows); do not imply a trend from unordered categories. Ratings with different scales are separate metrics.",
    inputSchema: z.object({ evidenceId: z.string(), metric: z.string(), view: z.enum(["bar", "line"]).default("bar") }),
    execute: async ({ evidenceId, metric, view }) => {
      const value = evidence.get(evidenceId) ?? await loadEvidence?.(evidenceId);
      if (!value) throw new ApiError(400, "Load the source evidence before charting it.");
      if (value.kind === "chart") return remember({ ...value, view });
      const matching = value.subjects.flatMap((subject) => {
        const found = subject.metrics.find((item) => item.key === metric);
        return found ? [{ subject, metric: found }] : [];
      });
      if (!matching.length) throw new ApiError(400, "This metric is not present in the source evidence.");
      const first = matching[0].metric;
      if (matching.some((item) => item.metric.unit !== first.unit || item.metric.source !== first.source)) throw new ApiError(400, "Choose a metric with a consistent source and unit.");
      return remember(researchChartSchema.parse({ kind: "chart", evidenceId: crypto.randomUUID(), title: first.label, source: first.source, unit: first.unit, view, basis: value.basis,
        series: [{ name: first.label, points: matching.map(({ subject, metric }) => ({ label: subject.name, value: metric.value })) }] }));
    },
  });
  return { remember, renderEvidenceChart };
}
