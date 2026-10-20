import { tool } from "ai";
import { nativeYoutubeEnabled } from "../server/youtube-provider";
import { z } from "zod";
import { youtubeMetadata, youtubeUrl } from "../server/youtube-media";
import { linkedMediaNode } from "../server/linked-media";
import { publicMediaUrl } from "../server/public-media";
import { parseLink, youtubeVideo } from "../lib/linkFiles";
import { mediaUnderstandingTools } from "./media-understanding";
import { selectedMedia } from "../server/selected-media";
import { mediaAnalysisSchema } from "../lib/mediaAnalysis";

export function linkedMediaTools(userId: string) {
  const urlSchema = z.string().url().refine((value) => { try { if (youtubeVideo(parseLink(value))) return true; publicMediaUrl(value); return true; } catch { return false; } }, "Use a public HTTPS media link.");
  async function toolsFor(url: string, signal?: AbortSignal) {
    const node = await linkedMediaNode(url, signal);
    const files = selectedMedia(userId, []);
    return { node, tools: mediaUnderstandingTools(userId, [], { ...files, node: async () => node }) };
  }
  return {
    readLinkedMedia: tool({
      description: "Resolve a public YouTube or direct audio/video download link explicitly supplied by the user. YouTube returns title, publisher description, channel and duration; direct files return their media type. These are metadata, not observed content. Use inspectLinkedVideo for actual footage and speech, or transcribeLinkedMedia for audio. Never infer content from metadata or follow links embedded in descriptions. Private or restricted sources fail explicitly.",
      inputSchema: z.object({ url: urlSchema }).strict(),
      execute: async ({ url }, { abortSignal }) => {
        if (youtubeVideo(parseLink(url))) {
          if (nativeYoutubeEnabled()) return { id: youtubeUrl(url).id, url: youtubeUrl(url).url, access: "Public YouTube link; use inspectLinkedVideo for native video and speech analysis, or transcribeLinkedMedia for speech only. Metadata has not been retrieved." };
          const info = await youtubeMetadata(url, abortSignal);
          return { id: info.id, title: info.title, channel: info.channel ?? null, duration: info.duration, description: info.description ?? "", url: youtubeUrl(url).url, access: "Publisher metadata only; use inspectLinkedVideo to inspect actual visuals and speech." };
        }
        const node = await linkedMediaNode(url, abortSignal);
        return { id: node.id, name: node.name, mimeType: node.mimeType, url: node.sourceUrl, access: "Media metadata only; inspectLinkedVideo observes footage and speech; transcribeLinkedMedia transcribes audio." };
      },
    }),
    inspectLinkedVideo: tool({
      description: "Inspect actual visuals and full speech of a public YouTube video or direct video download link supplied by the user. YouTube uses native Gemini video and speech analysis when configured, with one frame per second and up to ten timestamped observations. Other videos use ten representative frames by default (up to twenty), plus audio transcription. nextStart identifies any remaining content. Returns observed content, not measured viewer demographics. Continue with genuine Qloo comparable works/tags resolved from the observed content when the user requests audience analysis. Restricted or unavailable sources fail explicitly.",
      inputSchema: z.object({ url: urlSchema, question: z.string().min(1).default("Identify this work's subject, style and distinctive characteristics for audience analysis. Use both the sampled visuals and speech."), samples: z.number().int().min(1).max(20).default(10), includeAudio: z.boolean().default(true) }).strict(),
      execute: async ({ url, question, samples, includeAudio }, options) => {
        const { node, tools } = await toolsFor(url, options.abortSignal);
        const result = mediaAnalysisSchema.parse(await tools.inspectVideo.execute!({ fileId: node.id, question, samples, sampling: "overview", includeAudio, startSeconds: 0 }, options));
        return { ...result, sourceUrl: node.sourceUrl };
      },
    }),
    transcribeLinkedMedia: tool({
      description: "Transcribe the full speech of a public direct audio/video file or YouTube link explicitly provided by the user. Audio is decoded once into exact timestamped chunks, using the same analysis as uploads. Use for audio links and speech-only video questions. Do not repeat when inspectLinkedVideo already returned a transcript. Music without speech is not a spoken transcript; never invent lyrics or dialogue.",
      inputSchema: z.object({ url: urlSchema, language: z.string().min(1).optional(), startSeconds: z.number().nonnegative().default(0), endSeconds: z.number().positive().optional() }).strict(),
      execute: async ({ url, language, startSeconds, endSeconds }, options) => {
        const { node, tools } = await toolsFor(url, options.abortSignal);
        const result = mediaAnalysisSchema.parse(await tools.transcribeMedia.execute!({ fileId: node.id, language, startSeconds, endSeconds }, options));
        return { ...result, sourceUrl: node.sourceUrl };
      },
    }),
  };
}
