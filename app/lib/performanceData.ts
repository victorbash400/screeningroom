import { comparisonWidgetSchema, type ResearchMetric } from "./researchWidget.ts";

export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error("CSV has an unexpected quote.");
      quoted = true;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field); field = ""; closed = false;
      if (char !== ",") {
        if (char === "\r" && text[index + 1] === "\n") index++;
        if (row.some((value) => value.length)) rows.push(row);
        row = [];
      }
    } else {
      if (closed) throw new Error("CSV has text after a closing quote.");
      field += char;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quote.");
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
export function performanceRows(text: string, format: "csv" | "json") {
  if (format === "json") {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value) || value.some((row) => typeof row !== "object" || row === null || Array.isArray(row))) throw new Error("Use a JSON array of performance records.");
    return value as Record<string, unknown>[];
  }
  const [headers, ...rows] = csvRows(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  if (!headers?.length || headers.some((header) => !header.trim()) || new Set(headers).size !== headers.length) throw new Error("CSV needs unique, nonempty column names.");
  return rows.map((row) => {
    if (row.length !== headers.length) throw new Error("CSV rows must match the header columns.");
    return Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  });
}
export const performanceKeys = ["impressions", "clicks", "views", "conversions", "tickets", "spend", "revenue"] as const;
export type PerformanceKey = typeof performanceKeys[number];
export function projectPerformance(rows: Record<string, unknown>[], file: { id: string; name: string }, columns: Partial<Record<PerformanceKey, string>>, groupBy?: string) {
  if (!rows.length) throw new Error("The performance file has no records.");
  const chosen = performanceKeys.filter((key) => columns[key]);
  if (!chosen.length) throw new Error("Choose at least one performance column.");
  const money = chosen.includes("spend") || chosen.includes("revenue");
  const currencyColumn = Object.keys(rows[0]).find((key) => key.toLowerCase() === "currency");
  if (money && currencyColumn) {
    const currencies = new Set(rows.map((row) => {
      const value = row[currencyColumn];
      if (typeof value !== "string" || !value.trim()) throw new Error("Every monetary record needs a currency value.");
      return value.trim().toUpperCase();
    }));
    if (currencies.size > 1) throw new Error("This export mixes currencies. Analyze each currency in a separate export.");
  }
  const groups = new Map<string, Record<string, number>>();
  for (const [index, row] of rows.entries()) {
    const label = groupBy ? row[groupBy] : file.name;
    if (typeof label !== "string" && typeof label !== "number") throw new Error(`Row ${index + 1} needs a value for ${groupBy}.`);
    const name = String(label).trim();
    if (!name) throw new Error(`Row ${index + 1} has an empty group label.`);
    const totals = groups.get(name) ?? {};
    for (const key of chosen) {
      const raw = row[columns[key]!];
      if ((typeof raw !== "number" && typeof raw !== "string") || (typeof raw === "string" && !raw.trim())) throw new Error(`Row ${index + 1} needs a numeric ${columns[key]} value.`);
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || ((key !== "spend" && key !== "revenue") && !Number.isInteger(value))) throw new Error(`Row ${index + 1} has an invalid ${columns[key]} value. Use plain nonnegative numbers.`);
      totals[key] = (totals[key] ?? 0) + value;
      if (!Number.isFinite(totals[key])) throw new Error("Performance totals exceed numeric precision.");
    }
    groups.set(name, totals);
  }
  return comparisonWidgetSchema.parse({ kind: "comparison", evidenceId: crypto.randomUUID(), title: file.name, source: `Uploaded data · ${file.name}`, retrievedAt: new Date().toISOString(), commonTags: [],
    basis: "Totals from selected columns. CTR = clicks / impressions; conversion rate = conversions / clicks; ROAS = revenue / spend. Money uses the file’s own units; do not combine currencies. These are observed records, not forecasts.",
    subjects: [...groups].map(([name, values], index) => {
      const source = `${file.name} · ${rows.length} source records`;
      const metrics: ResearchMetric[] = chosen.map((key) => ({ key, label: key[0].toUpperCase() + key.slice(1), value: values[key], unit: key === "spend" || key === "revenue" ? "amount" : "count", source }));
      if (values.impressions > 0 && values.clicks !== undefined) metrics.push({ key: "ctr", label: "Click-through rate", value: values.clicks / values.impressions * 100, unit: "percent", source });
      if (values.clicks > 0 && values.conversions !== undefined) metrics.push({ key: "conversionRate", label: "Conversion rate", value: values.conversions / values.clicks * 100, unit: "percent", source });
      if (values.spend > 0 && values.revenue !== undefined) metrics.push({ key: "roas", label: "Return on ad spend", value: values.revenue / values.spend, unit: "ratio", source });
      return { id: `${file.id}:${index}`, name, tags: [], metrics };
    }) });
}
