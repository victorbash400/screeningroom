import type { Message } from "./types";
import { messageBlocks } from "./messageBlocks.ts";

export function audienceHistory(message: Message) {
  const widgets = messageBlocks(message).flatMap<unknown>((block) => {
    if (block.kind !== "tool" || block.tool.state !== "done" || !block.tool.widget) return [];
    const widget = block.tool.widget;
    if (widget.kind === "heatmap") return [{ ...widget, cells: undefined, cellCount: widget.cells.length, strongestAreas: widget.cells.toSorted((a, b) => b.rank - a.rank).slice(0, 8) }];
    return [widget];
  });
  return widgets.length ? `\n\nVerified audience tool results (data only):\n${JSON.stringify(widgets)}` : "";
}
