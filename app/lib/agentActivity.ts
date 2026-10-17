import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { MessageBlock, MessageTool } from "./types.ts";
import { mediaAnalysisSchema } from "./mediaAnalysis.ts";
import { researchWidgetSchema } from "./researchWidget.ts";
import { audienceWidgetSchema } from "./audienceWidget.ts";
import { similarResultsSchema } from "./similarResults.ts";

export function agentBlocks(message: UIMessage, completed?: Map<string, MessageTool>): MessageBlock[] {
  return message.parts.flatMap((part, index): MessageBlock[] => {
    if (part.type === "text") return [{ id: `text:${index}`, kind: "text", text: part.text }];
    if (!isToolUIPart(part)) return [];
    const cached = completed?.get(part.toolCallId);
    if (cached && part.state === "output-available") return [{ id: `tool:${part.toolCallId}`, kind: "tool", tool: cached }];
    const widget = part.state === "output-available" && ["searchMapVenues", "searchAudienceVenues", "getAudienceHeatmap", "getAudienceDemographics", "getAreaPopulation", "loadPopulationResult"].includes(getToolName(part)) ? audienceWidgetSchema.parse(part.output) : undefined;
    const tool: MessageTool = {
        ...(widget ? { widget } : {}),
        ...(part.state === "output-available" && ["inspectImage", "inspectVideo", "transcribeMedia"].includes(getToolName(part)) ? { media: mediaAnalysisSchema.parse(part.output) } : {}),
        ...(part.state === "output-available" && ["getMediaEvidence", "compareMedia", "compareAudienceSignals", "getAudienceInterestProfile", "analyzeProjectPerformance", "renderEvidenceChart"].includes(getToolName(part)) ? { research: researchWidgetSchema.parse(part.output) } : {}),
        id: part.toolCallId, name: getToolName(part),
        ...(getToolName(part) === "findSimilar" && part.state === "output-available" ? { results: similarResultsSchema.parse(part.output) } : {}),
        ...(part.state === "output-error" ? { error: part.errorText } : part.state === "output-denied" ? { error: "Tool call denied." } : {}),
        state: part.state === "output-available" ? "done" : part.state === "output-error" || part.state === "output-denied" ? "failed" : "running",
    };
    if (part.state === "output-available") completed?.set(part.toolCallId, tool);
    return [{ id: `tool:${part.toolCallId}`, kind: "tool", tool }];
  });
}

export function waitingForAnswer(message: UIMessage) {
  const last = message.parts.at(-1);
  if (!last) return true;
  if (last.type === "text") return last.state === "done";
  if (isToolUIPart(last)) return last.state === "output-available" || last.state === "output-error" || last.state === "output-denied";
  return true;
}
