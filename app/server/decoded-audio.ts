import "server-only";
import { mkdtemp, open, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeAudioFile } from "./media-processing";
import { ApiError } from "./http";

const bytesPerSecond = 32000, windowBytes = 30 * bytesPerSecond;
export async function withDecodedAudio<T>(source: string, start: number, end: number, format: string, run: (audio: { windows: { start: number; end: number }[]; read: (index: number) => Promise<Buffer>; bytes: number }) => Promise<T>, signal?: AbortSignal) {
  const directory = await mkdtemp(join(tmpdir(), "screeningroom-audio-"));
  try {
    const path = join(directory, "audio.pcm");
    await decodeAudioFile(source, start, end, format, path, signal);
    const size = (await stat(path)).size;
    if (!size || size % 2) throw new ApiError(422, "Audio decoded without readable samples.");
    const file = await open(path, "r");
    try {
      const windows = Array.from({ length: Math.ceil(size / windowBytes) }, (_, index) => ({ start: start + index * 30, end: start + Math.min(size, (index + 1) * windowBytes) / bytesPerSecond }));
      async function read(index: number) {
        signal?.throwIfAborted();
        if (!windows[index]) throw new ApiError(400, "Audio chunk is unavailable.");
        const length = Math.min(windowBytes, size - index * windowBytes), wav = Buffer.alloc(44 + length);
        wav.write("RIFF", 0); wav.writeUInt32LE(36 + length, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
        wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(bytesPerSecond, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(length, 40);
        let offset = 0;
        while (offset < length) {
          signal?.throwIfAborted();
          const { bytesRead } = await file.read(wav, 44 + offset, length - offset, index * windowBytes + offset);
          if (!bytesRead) throw new ApiError(422, "Audio chunk ended unexpectedly.");
          offset += bytesRead;
        }
        return wav;
      }
      return await run({ windows, read, bytes: size });
    } finally { await file.close(); }
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export function hasAudioSignal(wav: Uint8Array) {
  // Decoded chunks have a fixed 44-byte PCM WAV header; preserve even the quietest nonzero sample.
  for (let index = 44; index < wav.length; index++) if (wav[index] !== 0) return true;
  return false;
}

export function trimDigitalSilence(wav: Uint8Array) {
  let end = wav.length;
  while (end > 44 && wav[end - 1] === 0 && wav[end - 2] === 0) end -= 2;
  if (end === wav.length || end === 44) return wav;
  const trimmed = Buffer.from(wav.subarray(0, end));
  trimmed.writeUInt32LE(trimmed.length - 8, 4);
  trimmed.writeUInt32LE(trimmed.length - 44, 40);
  return trimmed;
}
