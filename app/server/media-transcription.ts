import "server-only";
import { audioModelId, transcribeClip } from "./media-model";
import { cachedMediaAnalysis } from "./media-analysis-cache";
import { withDecodedAudio, hasAudioSignal } from "./decoded-audio";
import { mediaInputFormat, probeMedia } from "./media-processing";
import { ApiError } from "./http";
import type { MediaLog } from "./media-diagnostics";
import type { selectedMedia } from "./selected-media";
import type { FileNode } from "../lib/types";
import type { MediaAnalysis } from "../lib/mediaAnalysis";

export async function transcribeFile(userId: string, node: FileNode, files: Pick<ReturnType<typeof selectedMedia>, "withSource">, start: number, endSeconds?: number, language?: string, signal?: AbortSignal, log?: MediaLog) {
  return cachedMediaAnalysis(userId, { version: 5, content: node.content, fileId: node.id, name: node.name, model: audioModelId(), language, start, endSeconds }, () => files.withSource(node, async (source): Promise<MediaAnalysis> => {
    const format = mediaInputFormat(node), metadata = await probeMedia(source, format, signal);
    log?.("audio-probe", { audioTracks: metadata.audioTracks, videoTracks: metadata.videoTracks, duration: metadata.audioDuration ?? metadata.duration });
    if (!metadata.hasAudio) throw new ApiError(422, "The uploaded file contains no audio track. Select a copy with sound or its separate audio file.");
    const duration = metadata.audioDuration ?? metadata.duration;
    if (!duration) throw new ApiError(422, "Audio duration is unavailable.");
    const end = Math.min(endSeconds ?? duration, duration);
    if (start >= end) throw new ApiError(400, "Choose a range inside this audio.");
    return withDecodedAudio(source, start, end, format, async (audio) => {
      log?.("audio-decoded", { bytes: audio.bytes, count: audio.windows.length, start, end });
      const segments: { start: number; end: number; text: string; silence?: boolean }[] = [], uncertainties: string[] = [];
      for (let index = 0; index < audio.windows.length; index += 2) {
        const results = await Promise.all(audio.windows.slice(index, index + 2).map(async (window, offset) => {
          const bytes = await audio.read(index + offset);
          if (!hasAudioSignal(bytes)) {
            log?.("audio-silence", { start: window.start, end: Math.min(window.end, end) });
            return { window, result: { transcript: "", uncertainties: [], silence: true } };
          }
          const result = await transcribeClip(bytes, language, signal);
          log?.("audio-chunk", { start: window.start, end: Math.min(window.end, end), model: audioModelId() });
          return { window, result };
        }));
        for (const { window, result } of results) {
          segments.push({ start: window.start, end: Math.min(window.end, end), text: result.transcript, ...("silence" in result ? { silence: true } : {}) });
          uncertainties.push(...result.uncertainties);
        }
      }
      return { kind: "media", fileId: node.id, name: node.name, modality: "audio", model: audioModelId(), duration, start, end, ...(end < duration ? { nextStart: end } : {}), summary: "", visibleText: "", uncertainties, segments };
    }, signal);
  }, signal), signal, log);
}
