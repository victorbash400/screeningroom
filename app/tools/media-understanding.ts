import { tool } from "ai";
import { z } from "zod";
import { selectedMedia } from "../server/selected-media";
import { mediaKind, audioWindows, type MediaAnalysis } from "../lib/mediaAnalysis";
import { imageFrame, probeMedia, audioClip, mediaInputFormat } from "../server/media-processing";
import { describeFrames, transcribeClip, visualModelId, audioModelId } from "../server/media-model";
import { cachedMediaAnalysis } from "../server/media-analysis-cache";
import { videoFrames } from "../server/video-frames";
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
        return cachedMediaAnalysis(userId, { version: 2, content: node.content, fileId, name: node.name, model: visualModelId(), question }, () => files.withSource(node, async (source) => {
          const bytes = await imageFrame(source, undefined, mediaInputFormat(node), abortSignal);
          const result = await describeFrames([{ bytes }], question, abortSignal);
          return { kind: "media", fileId, name: node.name, modality: "image", model: visualModelId(), summary: result.summary, visibleText: result.visibleText, uncertainties: result.uncertainties, segments: [] };
        }, abortSignal), abortSignal);
      },
    }),
    inspectVideo: tool({
      description: "Analyze selected video using compressed timestamped frame samples with Gemma 4. Uses at most five uniformly spaced interior frames over the full video; startSeconds/endSeconds and samples allow a closer look at a chosen range. Only the sampled frames were inspected, not every scene or the soundtrack. Report coverage and uncertainty; use transcribeMedia separately for speech. Do not make up motion or missed scenes.",
      inputSchema: z.object({ fileId: z.string(), question: z.string().min(1).default("Describe the visible subjects, setting, style and on-screen text in these sampled frames."), samples: z.number().int().min(1).max(5).default(5), ...rangeSchema }),
      execute: async ({ fileId, question, samples, startSeconds, endSeconds }, { abortSignal }) => {
        const node = await files.node(fileId);
        if (mediaKind(node) !== "video") throw new ApiError(400, "Select a video file.");
        return cachedMediaAnalysis(userId, { version: 4, content: node.content, fileId, name: node.name, model: visualModelId(), question, samples, startSeconds, endSeconds }, async () => {
          const prepared = await videoFrames(userId, node, samples, startSeconds, endSeconds, (prepare) => files.withSource(node, prepare, abortSignal), abortSignal);
          const { duration, hasAudio, start, end, frames } = prepared;
          const batches: typeof frames[] = [];
          let batch: typeof frames = [], size = 0;
          for (const frame of frames) {
            const encoded = 4 * Math.ceil(frame.bytes.length / 3) + 100;
            if (batch.length && size + encoded > 2_800_000) { batches.push(batch); batch = []; size = 0; }
            batch.push(frame); size += encoded;
          }
          if (batch.length) batches.push(batch);
          const results = [];
          for (const batch of batches) results.push({ batch, result: await describeFrames(batch, question, abortSignal) });
          return { kind: "media", fileId, name: node.name, modality: "video", model: visualModelId(), duration, hasAudio, start, end,
            summary: results.map(({ result }) => result.summary).join("\n\n"), visibleText: results.map(({ result }) => result.visibleText).filter(Boolean).join("\n"), uncertainties: [...new Set(results.flatMap(({ result }) => result.uncertainties))],
            segments: results.flatMap(({ batch, result }) => result.frames.map((frame) => ({ start: batch[frame.index].time, text: frame.description }))).toSorted((a, b) => a.start - b.start) };
        }, abortSignal);
      },
    }),
    transcribeMedia: tool({
      description: "Transcribe speech from a selected audio or video file using Gemma 4 E2B. Defaults to the next 2 minutes starting at startSeconds; an explicit endSeconds can select another range. Audio is downmixed and split into the model's 30-second windows. Results have actual chunk coverage, not word-level timestamps. A partial transcript has a Continue action; do not claim the full file was transcribed or repeatedly auto-continue without the user's request. No-speech and uncertainty remain explicit.",
      inputSchema: z.object({ fileId: z.string(), language: z.string().min(1).optional(), ...rangeSchema }),
      execute: async ({ fileId, language, startSeconds, endSeconds }, { abortSignal }) => {
        const node = await files.node(fileId);
        if (!["audio", "video"].includes(mediaKind(node) ?? "")) throw new ApiError(400, "Select an audio or video file.");
        return cachedMediaAnalysis(userId, { version: 2, content: node.content, fileId, name: node.name, model: audioModelId(), language, startSeconds, endSeconds }, () => files.withSource(node, async (source): Promise<MediaAnalysis> => {
          const metadata = await probeMedia(source, mediaInputFormat(node), abortSignal);
          if (!metadata.hasAudio) throw new ApiError(422, "This file has no audio track.");
          if (!metadata.duration) throw new ApiError(422, "Audio duration is unavailable.");
          const end = Math.min(endSeconds ?? startSeconds + 120, metadata.duration);
          if (startSeconds >= end) throw new ApiError(400, "Choose a range inside this audio.");
          const segments = [], uncertainties: string[] = [];
          const windows = audioWindows(startSeconds, end);
          for (let index = 0; index < windows.length; index += 2) {
            const results = await Promise.all(windows.slice(index, index + 2).map(async (window) => {
              const clip = await audioClip(source, window.start, window.end, mediaInputFormat(node), abortSignal);
              return { window, result: await transcribeClip(clip, language, abortSignal) };
            }));
            for (const { window, result } of results) { segments.push({ ...window, text: result.transcript }); uncertainties.push(...result.uncertainties); }
          }
          return { kind: "media", fileId, name: node.name, modality: "audio", model: audioModelId(), duration: metadata.duration, start: startSeconds, end, ...(end < metadata.duration ? { nextStart: end } : {}), summary: "", visibleText: "", uncertainties, segments };
        }, abortSignal), abortSignal);
      },
    }),
  };
}
