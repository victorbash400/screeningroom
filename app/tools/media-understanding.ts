import { tool } from "ai";
import { z } from "zod";
import { selectedMedia } from "../server/selected-media";
import { mediaKind } from "../lib/mediaAnalysis";
import { imageFrame, mediaInputFormat } from "../server/media-processing";
import { describeFrames, visualModelId, audioModelId } from "../server/media-model";
import { cachedMediaAnalysis } from "../server/media-analysis-cache";
import { videoFrames } from "../server/video-frames";
import { transcribeFile } from "../server/media-transcription";
import { withPreparedMedia } from "../server/prepared-media";
import { diagnoseMedia } from "../server/media-diagnostics";
import { ApiError } from "../server/http";

const rangeSchema = { startSeconds: z.number().nonnegative().default(0), endSeconds: z.number().positive().optional() };
export function mediaUnderstandingTools(userId: string, selectedIds: string[], files = selectedMedia(userId, selectedIds)) {
  return {
    inspectImage: tool({
      description: "Inspect a selected uploaded image with Gemma 4: describe visible content, extract legible text and identify uncertainty. The image is resized before inference (first frame only for animated images); do not infer identities, unseen details or performance. Returns a saved inline analysis. Only selected workspace media is accessible.",
      inputSchema: z.object({ fileId: z.string(), question: z.string().min(1).default("Describe the image and transcribe its visible text.") }),
      execute: async ({ fileId, question }, { abortSignal }) => {
        const node = await files.node(fileId);
        if (mediaKind(node) !== "image") throw new ApiError(400, "Select an image file.");
        return cachedMediaAnalysis(userId, { version: 2, content: node.content, sourceUrl: node.sourceUrl, fileId, name: node.name, model: visualModelId(), question }, () => files.withSource(node, async (source) => {
          const bytes = await imageFrame(source, undefined, mediaInputFormat(node), abortSignal);
          const result = await describeFrames([{ bytes }], question, abortSignal);
          return { kind: "media", fileId, name: node.name, modality: "image", model: visualModelId(), summary: result.summary, visibleText: result.visibleText, uncertainties: result.uncertainties, segments: [] };
        }, abortSignal), abortSignal);
      },
    }),
    inspectVideo: tool({
      description: "Understand a selected uploaded video with sampled visuals and its full speech transcript in one call. Defaults to eight representative frames including an early sample; samples and sampling can compare configurations. By default includeAudio transcribes the entire audio track across the requested range when present. Set includeAudio false only for purely visual questions. The result contains hasAudio and transcript, so do not call transcription again unnecessarily. Only sampled visuals were seen; do not invent scenes, exact transitions, people’s identities, or speech absent from the transcript.",
      inputSchema: z.object({ fileId: z.string(), question: z.string().min(1).default("Describe the visible subjects, setting, style and on-screen text in these sampled frames."), samples: z.number().int().min(1).max(8).default(8), sampling: z.enum(["uniform", "overview"]).default("overview"), includeAudio: z.boolean().default(true), ...rangeSchema }),
      execute: async ({ fileId, question, samples, sampling, includeAudio, startSeconds, endSeconds }, { abortSignal }) => diagnoseMedia("video", fileId, async (log) => {
        const node = await files.node(fileId);
        if (mediaKind(node) !== "video") throw new ApiError(400, "Select a video file.");
        return cachedMediaAnalysis(userId, { version: 10, content: node.content, sourceUrl: node.sourceUrl, fileId, name: node.name, model: visualModelId(), audioModel: includeAudio ? audioModelId() : undefined, question, samples, sampling, includeAudio, startSeconds, endSeconds }, () => withPreparedMedia(userId, node, async (withSource) => {
          const prepared = await videoFrames(userId, node, samples, startSeconds, endSeconds, (prepare) => withSource(prepare), abortSignal, sampling, log);
          const { duration, hasAudio, start, end, frames } = prepared;
          const speech = hasAudio && includeAudio ? transcribeFile(userId, node, { withSource: (_node, operation) => withSource(operation) }, startSeconds, endSeconds, undefined, abortSignal, log) : undefined;
          const visual = async () => {
            const batches: typeof frames[] = [];
            let batch: typeof frames = [], size = 0;
            for (const frame of frames) {
              const encoded = 4 * Math.ceil(frame.bytes.length / 3) + 100;
              if (batch.length && size + encoded > 2_800_000) { batches.push(batch); batch = []; size = 0; }
              batch.push(frame); size += encoded;
            }
            if (batch.length) batches.push(batch);
            const results = [];
            for (const batch of batches) results.push({ batch, result: await describeFrames(batch, question, abortSignal, log) });
            return results;
          };
          const [results, audio] = await Promise.all([visual(), speech]);
          return { kind: "media", fileId, name: node.name, modality: "video", model: visualModelId(), duration, hasAudio, start, end,
            ...(audio ? { transcript: { model: audio.model, start: audio.start!, end: audio.end!, duration: audio.duration!, complete: audio.start === 0 && audio.nextStart === undefined, segments: audio.segments.map((segment) => ({ ...segment, end: segment.end! })), uncertainties: audio.uncertainties } } : {}),
            summary: results.map(({ result }) => result.summary).join("\n\n"), visibleText: results.map(({ result }) => result.visibleText).filter(Boolean).join("\n"), uncertainties: [...new Set(results.flatMap(({ result }) => result.uncertainties))],
            segments: results.flatMap(({ batch, result }) => result.frames.map((frame) => ({ start: batch[frame.index].time, text: frame.description }))).toSorted((a, b) => a.start - b.start) };
        }, abortSignal, log), abortSignal, log);
      }),
    }),
    transcribeMedia: tool({
      description: "Transcribe the full speech track of a selected audio or video file with Gemma 4 E2B. Defaults to the entire file; startSeconds/endSeconds can choose a range. Audio is decoded once, then read as exact 30-second chunks with timestamped coverage. Speech absence, missing audio and uncertain passages are distinct. Do not repeat this if inspectVideo already supplied its transcript.",
      inputSchema: z.object({ fileId: z.string(), language: z.string().min(1).optional(), ...rangeSchema }),
      execute: async ({ fileId, language, startSeconds, endSeconds }, { abortSignal }) => diagnoseMedia("transcription", fileId, async (log) => {
        const node = await files.node(fileId);
        if (!["audio", "video"].includes(mediaKind(node) ?? "")) throw new ApiError(400, "Select an audio or video file.");
        return transcribeFile(userId, node, files, startSeconds, endSeconds, language, abortSignal, log);
      }),
    }),
  };
}
