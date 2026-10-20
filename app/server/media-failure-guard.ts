import "server-only";
import type { ToolSet } from "ai";
import { z } from "zod";
import { parseLink, youtubeVideo } from "../lib/linkFiles";
import { ApiError } from "./http";

const mediaTools = new Set(["inspectImage", "inspectVideo", "transcribeMedia", "inspectLinkedVideo", "transcribeLinkedMedia"]);
const assetInput = z.object({ fileId: z.string().optional(), url: z.string().optional() });
const partialFailure = z.object({ transcriptError: z.string() });
function linkKey(value: string) {
  const url = parseLink(value);
  const youtube = youtubeVideo(url);
  url.hash = "";
  return youtube ? `youtube:${youtube}` : url.href;
}

export function withMediaFailureGuard<T extends ToolSet>(tools: T, selection: { id: string; sourceUrl?: string }[] = []): T {
  const failed = new Set<string>();
  const links = new Map(selection.filter(file => file.sourceUrl).map(file => [file.id, linkKey(file.sourceUrl!)]));
  return Object.fromEntries(Object.entries(tools).map(([name, definition]) => {
    const execute = definition.execute;
    if (!execute || !mediaTools.has(name)) return [name, definition];
    return [name, { ...definition, execute: async (input: never, options: Parameters<typeof execute>[1]) => {
      const asset = assetInput.parse(input);
      const key = asset.url ? linkKey(asset.url) : asset.fileId ? links.get(asset.fileId) ?? asset.fileId : undefined;
      if (!key) throw new ApiError(400, "Select a media file or provide its link.");
      if (failed.has(key)) throw new ApiError(409, "Media analysis already failed in this reply. Report the error; retry only when the user asks again.");
      try {
        const result = await execute(input, options);
        if (partialFailure.safeParse(result).success) failed.add(key);
        return result;
      } catch (error) {
        failed.add(key);
        throw error;
      }
    } }];
  })) as T;
}
