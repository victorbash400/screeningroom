import type { ComparisonWidget } from "./researchWidget";

export function compareMetrics(subjects: ComparisonWidget["subjects"]) {
  const groups = new Map<string, { metric: ComparisonWidget["subjects"][number]["metrics"][number]; values: { id: string; value: number }[] }>();
  for (const subject of subjects) for (const metric of subject.metrics) {
    const key = JSON.stringify([metric.key, metric.source, metric.unit]);
    const group = groups.get(key) ?? { metric, values: [] };
    group.values.push({ id: subject.id, value: metric.value });
    groups.set(key, group);
  }
  return [...groups.values()].filter(({ values }) => values.length >= 2).map(({ metric, values }) => {
    const minimum = Math.min(...values.map(({ value }) => value)), maximum = Math.max(...values.map(({ value }) => value));
    return { key: metric.key, label: metric.label, unit: metric.unit, source: metric.source,
      highest: values.filter(({ value }) => value === maximum).map(({ id }) => id), lowest: values.filter(({ value }) => value === minimum).map(({ id }) => id),
      minimum, maximum, gap: maximum - minimum, coverage: values.length, total: subjects.length };
  });
}
