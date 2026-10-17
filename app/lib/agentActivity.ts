import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { MessageBlock, MessageTool } from "./types.ts";
import { mediaAnalysisSchema } from "./mediaAnalysis.ts";
import { researchWidgetSchema } from "./researchWidget.ts";
import { audienceWidgetSchema } from "./audienceWidget.ts";
import { similarResultsSchema } from "./similarResults.ts";

export function agentBlocks(message: UIMessage, activity?: Map<string, MessageTool>, now = Date.now()): MessageBlock[] {
  return message.parts.flatMap((part, index): MessageBlock[] => {
    if (part.type === "text") return [{ id: `text:${index}`, kind: "text", text: part.text }];
    if (!isToolUIPart(part)) return [];
    const cached = activity?.get(part.toolCallId);
    if (cached && cached.state !== "running") return [{ id: `tool:${part.toolCallId}`, kind: "tool", tool: cached }];
    const widget = part.state === "output-available" && ["searchMapVenues", "searchAudienceVenues", "getAudienceHeatmap", "getAudienceDemographics", "getAreaPopulation", "loadPopulationResult"].includes(getToolName(part)) ? audienceWidgetSchema.parse(part.output) : undefined;
    const terminal = ["output-available", "output-error", "output-denied"].includes(part.state);
    const tool: MessageTool = {
        startedAt: cached?.startedAt ?? now,
        ...(terminal ? { endedAt: now } : {}),
        ...(widget ? { widget } : {}),
        ...(part.state === "output-available" && ["inspectImage", "inspectVideo", "transcribeMedia"].includes(getToolName(part)) ? { media: mediaAnalysisSchema.parse(part.output) } : {}),
        ...(part.state === "output-available" && ["getMediaEvidence", "compareMedia", "compareAudienceSignals", "getAudienceInterestProfile", "analyzeProjectPerformance", "renderEvidenceChart"].includes(getToolName(part)) ? { research: researchWidgetSchema.parse(part.output) } : {}),
        id: part.toolCallId, name: getToolName(part),
        ...(getToolName(part) === "findSimilar" && part.state === "output-available" ? { results: similarResultsSchema.parse(part.output) } : {}),
        ...(part.state === "output-error" ? { error: part.errorText } : part.state === "output-denied" ? { error: "Tool call denied." } : {}),
        state: part.state === "output-available" ? "done" : part.state === "output-error" || part.state === "output-denied" ? "failed" : "running",
    };
    activity?.set(part.toolCallId, tool);
    return [{ id: `tool:${part.toolCallId}`, kind: "tool", tool }];
  });
}

export function waitingForAnswer(message: UIMessage) {
  if (message.parts.some((part) => isToolUIPart(part) && !["output-available", "output-error", "output-denied"].includes(part.state))) return false;
  const last = message.parts.at(-1);
  if (!last) return true;
  if (last.type === "text") return !last.text.trim();
  return true;
}
