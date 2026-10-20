import { z } from "zod";
import type { Message } from "./types";
import type { HistoryTool } from "./modelChatHistory";
import { messageBlocks } from "./messageBlocks.ts";
import { performanceOutput } from "../tools/performance-output.ts";

export function audienceHistory(message: Message): HistoryTool[] {
  return messageBlocks(message).flatMap((block) => {
    if (block.kind !== "tool" || block.tool.state !== "done" && !(block.tool.state === "failed" && block.tool.media?.transcriptError)) return [];
    const tool = block.tool;
    let output: unknown;
    if (tool.media) output = tool.media;
    else if (tool.research) {
      const result = tool.research;
      if (result.kind === "digital") output = { ...result, platforms: result.platforms ? performanceOutput(result.platforms).value : undefined, comparables: result.comparables ? performanceOutput(result.comparables).value : undefined };
      else output = result.kind === "comparison" ? performanceOutput(result).value : result;
    } else if (tool.widget) {
      const widget = tool.widget;
      output = widget.kind === "heatmap" ? { ...widget, cells: undefined, cellCount: widget.cells.length, strongestAreas: widget.cells.toSorted((a, b) => b.rank - a.rank).slice(0, 8) } : widget;
    } else if (tool.results) output = tool.results;
    else if (tool.trace?.matches) output = tool.trace.matches.map((match) => tool.name === "searchAudienceTags" ? { id: match.id, name: match.name } : { entity_id: match.id, name: match.name });
    else if (tool.name === "establishAudienceWork" && tool.trace) output = { work: tool.trace.input, established: true };
    if (output === undefined) return [];
    return [{ id: tool.id, name: tool.name, input: tool.trace?.input ?? {}, output: z.json().parse(JSON.parse(JSON.stringify(output))) }];
  });
}
