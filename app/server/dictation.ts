import "server-only";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApiError } from "./http";
import { probeMedia } from "./media-processing";
import { withDecodedAudio, hasAudioSignal, trimDigitalSilence } from "./decoded-audio";
import { transcribeClip } from "./media-model";

const formats: Record<string, string> = { "audio/webm": "matroska", "audio/mp4": "mov", "audio/ogg": "ogg", "audio/wav": "wav" };
export const recordingLimit = 4_000_000;
export function recordingFormat(type: string) {
  const format = formats[type.split(";")[0].trim().toLowerCase()];
  if (!format) throw new ApiError(415, "Record audio as WebM, MP4, Ogg or WAV.");
  return format;
}
export async function recordingBytes(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Recording is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > recordingLimit) { await reader.cancel(); throw new ApiError(413, "Recording exceeds 4 MB. Record a shorter message."); }
    chunks.push(result.value);
  }
  if (!size) throw new ApiError(400, "Recording is empty.");
  return Buffer.concat(chunks);
}
export async function transcribeRecording(bytes: Uint8Array, format: string, signal?: AbortSignal) {
  const directory = await mkdtemp(join(tmpdir(), "screeningroom-dictation-"));
  try {
    const path = join(directory, "recording");
    await writeFile(path, bytes);
    const metadata = await probeMedia(path, format, signal);
    if (!metadata.hasAudio || metadata.hasVideo) throw new ApiError(422, "Record an audio message.");
    // Streaming WebM recordings can omit duration metadata; decoded PCM is measured below.
    if ((metadata.audioDuration ?? metadata.duration ?? 0) > 180) throw new ApiError(413, "Recording exceeds 3 minutes. Record a shorter message.");
    return await withDecodedAudio(path, 0, 181, format, async (audio) => {
      if (audio.bytes > 180 * 32000) throw new ApiError(413, "Recording exceeds 3 minutes. Record a shorter message.");
      const text: string[] = [];
      for (let index = 0; index < audio.windows.length; index++) {
        const chunk = await audio.read(index);
        if (!hasAudioSignal(chunk)) continue;
        const result = await transcribeClip(trimDigitalSilence(chunk), undefined, signal);
        if (result.transcript.trim()) text.push(result.transcript.trim());
      }
      if (!text.length) throw new ApiError(422, "No words detected. Record again.");
      return text.join(" ");
    }, signal);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
