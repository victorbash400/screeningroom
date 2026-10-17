import "server-only";
import { execFile } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";
import { z } from "zod";
import type { FileNode } from "../lib/types";
import { mediaKind } from "../lib/mediaAnalysis";
import { ApiError } from "./http";

function run(binary: string, args: string[], signal?: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { signal, maxBuffer: 16 * 1024 * 1024, encoding: "buffer" }, (error, stdout) => {
      if (error) { if (["ENOENT", "EACCES"].includes(String(error.code))) { reject(new ApiError(503, "Media processing binaries are unavailable.")); return; } reject(signal?.aborted ? signal.reason : new ApiError(422, "Media could not be decoded. Check its format or upload a converted copy.")); return; }
      resolve(stdout);
    });
  });
}
function ffmpegBinary() {
  const path = process.env.FFMPEG_PATH || ffmpeg;
  if (!path) throw new ApiError(503, "Media processing is not configured.");
  return path;
}
export function mediaInputFormat(node: FileNode) {
  if (mediaKind(node) === "image") return "image2pipe";
  const formats: Record<string, string> = { mp4: "mov", mov: "mov", m4v: "mov", m4a: "mov", webm: "matroska", mkv: "matroska", avi: "avi", mpeg: "mpeg", mpg: "mpeg", mp3: "mp3", wav: "wav", aac: "aac", flac: "flac", ogg: "ogg", opus: "ogg", aiff: "aiff", aif: "aiff" };
  const extension = node.name.slice(node.name.lastIndexOf(".") + 1).toLowerCase();
  const format = formats[extension] ?? formats[node.mimeType?.split("/")[1] ?? ""];
  if (!format) throw new ApiError(415, "Convert this media to MP4, WebM, MP3 or WAV before analysis.");
  return format;
}
const probeSchema = z.object({ format: z.object({ duration: z.string().optional() }), streams: z.array(z.object({ codec_type: z.string(), width: z.number().optional(), height: z.number().optional(), duration: z.string().optional(), avg_frame_rate: z.string().optional() })) });
export async function probeMedia(source: string, format: string, signal?: AbortSignal) {
  const bytes = await run(process.env.FFPROBE_PATH || ffprobe.path, ["-v", "error", "-protocol_whitelist", source.startsWith("https:") ? "https,tls,tcp,crypto" : "file,pipe", "-f", format, "-show_format", "-show_streams", "-of", "json", source], signal);
  const parsed = probeSchema.safeParse(JSON.parse(bytes.toString("utf8")));
  if (!parsed.success) throw new ApiError(422, "Media metadata is invalid.");
  const duration = Number(parsed.data.format.duration);
  const video = parsed.data.streams.find((stream) => stream.codec_type === "video");
  const rate = video?.avg_frame_rate?.split("/").map(Number);
  const frameRate = rate?.length === 2 && rate[1] > 0 ? rate[0] / rate[1] : undefined;
  const videoDuration = Number(video?.duration);
  return { frameRate: frameRate && Number.isFinite(frameRate) ? frameRate : undefined, videoDuration: videoDuration > 0 && Number.isFinite(videoDuration) ? videoDuration : undefined, duration: Number.isFinite(duration) && duration > 0 ? duration : undefined, hasAudio: parsed.data.streams.some((stream) => stream.codec_type === "audio"), hasVideo: parsed.data.streams.some((stream) => stream.codec_type === "video") };
}
export async function imageFrame(source: string, time: number | undefined, format: string, signal?: AbortSignal) {
  const result = await run(ffmpegBinary(), ["-hide_banner", "-loglevel", "error", "-protocol_whitelist", source.startsWith("https:") ? "https,tls,tcp,crypto" : "file,pipe", ...(time === undefined ? [] : ["-ss", String(time)]), "-f", format, "-i", source, "-frames:v", "1", "-vf", "scale=w='min(1024,iw)':h='min(1024,ih)':force_original_aspect_ratio=decrease", "-q:v", "5", "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"], signal);
  if (!result.length) throw new ApiError(422, "This media has no readable image frame.");
  return result;
}
export function audioClip(source: string, start: number, end: number, format: string, signal?: AbortSignal) {
  return run(ffmpegBinary(), ["-hide_banner", "-loglevel", "error", "-protocol_whitelist", source.startsWith("https:") ? "https,tls,tcp,crypto" : "file,pipe", "-ss", String(start), "-f", format, "-i", source, "-t", String(end - start), "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", "pipe:1"], signal);
}
