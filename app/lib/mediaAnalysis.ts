import { z } from "zod";
import type { FileNode } from "./types.ts";

export function mediaKind(node: Pick<FileNode, "name" | "mimeType" | "kind">): "image" | "video" | "audio" | undefined {
  if (node.kind !== "file") return;
  for (const kind of ["image", "video", "audio"] as const) if (node.mimeType?.startsWith(`${kind}/`)) return kind;
  const extension = node.name.slice(node.name.lastIndexOf(".") + 1).toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "heic", "heif", "bmp", "tif", "tiff"].includes(extension)) return "image";
  if (["mp4", "mov", "m4v", "webm", "mkv", "avi", "mpeg", "mpg"].includes(extension)) return "video";
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg", "aiff", "aif", "opus"].includes(extension)) return "audio";
}
export const mediaAnalysisSchema = z.object({
  kind: z.literal("media"), fileId: z.string().min(1), name: z.string().min(1), modality: z.enum(["image", "video", "audio"]), model: z.string().min(1),
  summary: z.string(), visibleText: z.string(), uncertainties: z.array(z.string()),
  duration: z.number().nonnegative().optional(), start: z.number().nonnegative().optional(), end: z.number().nonnegative().optional(),
  hasAudio: z.boolean().optional(),
  nextStart: z.number().nonnegative().optional(),
  segments: z.array(z.object({ start: z.number().nonnegative(), end: z.number().nonnegative().optional(), text: z.string() }).strict()),
}).strict();
export type MediaAnalysis = z.infer<typeof mediaAnalysisSchema>;
export function sampleTimes(start: number, end: number, count: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || !Number.isSafeInteger(count) || count < 1) throw new Error("Choose a valid media range and sample count.");
  return Array.from({ length: count }, (_, index) => start + (end - start) * (index + .5) / count);
}
export function audioWindows(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) throw new Error("Choose a valid audio range.");
  const windows: { start: number; end: number }[] = [];
  for (let position = start; position < end; position += 30) windows.push({ start: position, end: Math.min(end, position + 30) });
  return windows;
}
export function mediaTime(seconds: number) {
  const value = Math.floor(seconds);
  const hours = Math.floor(value / 3600), minutes = Math.floor(value / 60) % 60;
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(hours ? 2 : 1, "0")}:${String(value % 60).padStart(2, "0")}`;
}
