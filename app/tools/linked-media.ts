import { tool } from "ai";
import { z } from "zod";
import { youtubeNode, youtubeMetadata, youtubeUrl } from "../server/youtube-media";
import { mediaUnderstandingTools } from "./media-understanding";
import { selectedMedia } from "../server/selected-media";
import { mediaAnalysisSchema } from "../lib/mediaAnalysis";

export function linkedMediaTools(userId: string) {
  const urlSchema = z.string().url().refine((value) => { try { youtubeUrl(value); return true; } catch { return false; } }, "Use a YouTube video link.");
  return {
    readLinkedMedia: tool({
      description: "Read public YouTube title, publisher description, channel and duration for a link explicitly supplied by the user. These are metadata, not observed content. To understand the footage and speech call inspectLinkedVideo; never infer the entire work from the title, description, thumbnail or unrelated links in its description. Private/restricted/unavailable links fail explicitly. Other sites require an uploaded file or transcript.",
      inputSchema: z.object({ url: urlSchema }).strict(),
      execute: async ({ url }, { abortSignal }) => {
        const info = await youtubeMetadata(url, abortSignal);
        return { id: info.id, title: info.title, channel: info.channel ?? null, duration: info.duration, description: info.description ?? "", url: youtubeUrl(url).url, access: "Publisher metadata only; use inspectLinkedVideo to inspect actual visuals and speech." };
      },
    }),
    inspectLinkedVideo: tool({
      description: "Inspect the actual visuals and full speech of a public YouTube video explicitly linked by the user, using the same cached sampled-frame and full-audio analysis as an uploaded video. Prepares a low-resolution MP4 while preserving audio, remuxing separate streams without re-encoding when needed. Resolves its real title, samples up to eight frames and transcribes the complete audio track. This is a content overview, not the measured demographics of that video's viewers. Then resolve genuine Qloo comparable works/tags from observed content for Live or Digital audience tools. Unavailable/restricted videos or missing backend yt-dlp fail explicitly; request an upload rather than inventing what was seen.",
      inputSchema: z.object({ url: urlSchema, question: z.string().min(1).default("Identify this work's subject, style and distinctive characteristics for audience analysis. Use both the sampled visuals and speech."), samples: z.number().int().min(1).max(8).default(5), includeAudio: z.boolean().default(true) }).strict(),
      execute: async ({ url, question, samples, includeAudio }, options) => {
        const node = await youtubeNode(url, options.abortSignal);
        const files = selectedMedia(userId, []);
        const tools = mediaUnderstandingTools(userId, [], { ...files, node: async () => node });
        const result = mediaAnalysisSchema.parse(await tools.inspectVideo.execute!({ fileId: node.id, question, samples, sampling: "overview", includeAudio, startSeconds: 0 }, options));
        return { ...result, sourceUrl: node.sourceUrl };
      },
    }),
  };
}
