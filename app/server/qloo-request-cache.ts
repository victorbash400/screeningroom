import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import type { ToolSet } from "ai";
import type { HistoryTool } from "../lib/modelChatHistory";
import { ApiError } from "./http";

type RequestContext = { requests: Map<string, Promise<unknown>>; signals: Set<string> };
export const qlooRequestContext = new AsyncLocalStorage<RequestContext>();
const records = z.array(z.object({ id: z.string().optional(), entity_id: z.string().optional() }));
function remember(context: RequestContext, value: unknown) {
  const parsed = records.safeParse(value);
  if (!parsed.success) return;
  for (const item of parsed.data) {
    const id = item.entity_id ?? item.id;
    if (id && (z.uuid().safeParse(id).success || id.startsWith("urn:tag:"))) context.signals.add(id.toLowerCase());
  }
}
export function rememberQlooSignals(value: unknown) {
  const context = qlooRequestContext.getStore();
  if (!context) return;
  const envelope = z.object({ results: z.unknown() }).safeParse(value);
  if (!envelope.success) return;
  if (Array.isArray(envelope.data.results)) remember(context, envelope.data.results);
  else {
    const result = z.object({ entities: z.unknown().optional(), tags: z.unknown().optional() }).safeParse(envelope.data.results);
    if (result.success) { remember(context, result.data.entities); remember(context, result.data.tags); }
  }
}
export function checkQlooSignals(parameters: Record<string, string>) {
  const context = qlooRequestContext.getStore();
  if (!context) return;
  const keys = ["signal.interests.entities", "signal.interests.tags", "a.signal.interests.entities", "b.signal.interests.entities"];
  if (parameters["filter.type"] !== "urn:entity:place") keys.push("filter.tags");
  for (const key of keys) {
    const unresolved = parameters[key]?.split(",").filter((id) => !context.signals.has(id.toLowerCase()));
    if (unresolved?.length) throw new ApiError(400, "Resolve audience references with searchEntities or searchAudienceTags before using their IDs. Use only IDs returned by those tools or prior Qloo evidence.");
  }
}
function rememberHistory(context: RequestContext, tool: HistoryTool) {
  if (["searchEntities", "searchAudienceTags"].includes(tool.name)) { remember(context, tool.output); return; }
  const comparison = z.object({ subjects: z.unknown().optional() });
  if (["getMediaEvidence", "compareMedia", "getDigitalPlatformFit", "findComparableMedia"].includes(tool.name)) {
    const result = comparison.safeParse(tool.output);
    if (result.success) remember(context, result.data.subjects);
  }
  if (tool.name === "analyzeDigitalAudience") {
    const result = z.object({ platforms: comparison.nullish(), comparables: comparison.nullish() }).safeParse(tool.output);
    if (result.success) { remember(context, result.data.platforms?.subjects); remember(context, result.data.comparables?.subjects); }
  }
}
export function withQlooRequestReuse<T extends ToolSet>(tools: T, history: HistoryTool[] = []): T {
  const context: RequestContext = { requests: new Map(), signals: new Set() };
  for (const tool of history) rememberHistory(context, tool);
  return Object.fromEntries(Object.entries(tools).map(([name, definition]) => {
    const execute = definition.execute;
    return [name, execute ? { ...definition, execute: (input: never, options: Parameters<typeof execute>[1]) => qlooRequestContext.run(context, () => execute(input, options)) } : definition];
  })) as T;
}
