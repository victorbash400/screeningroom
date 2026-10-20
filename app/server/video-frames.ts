import "server-only";
import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { storage } from "./aws";
import { env } from "./config";
import { ApiError } from "./http";
import { imageFrame, mediaInputFormat, probeMedia } from "./media-processing";
import type { MediaLog } from "./media-diagnostics";
import { videoSampleTimes } from "../lib/mediaAnalysis";
import type { FileNode } from "../lib/types";

const frameSet = z.object({ duration: z.number().positive(), hasAudio: z.boolean(), start: z.number().nonnegative(), end: z.number().positive(), frames: z.array(z.object({ time: z.number().nonnegative(), image: z.string().min(1) }).strict()).min(1).max(20) }).strict();
type FrameSet = z.infer<typeof frameSet>;
export async function videoFrames(userId: string, node: FileNode, samples: number, start: number, endSeconds: number | undefined, withSource: (prepare: (url: string) => Promise<FrameSet>) => Promise<FrameSet>, signal?: AbortSignal, strategy: "uniform" | "overview" = "uniform", log?: MediaLog) {
  const key = createHash("sha256").update(JSON.stringify({ version: 3, content: node.content, sourceUrl: node.sourceUrl, samples, start, endSeconds, strategy })).digest("hex");
  const location = { Bucket: env("S3_BUCKET_NAME"), Key: `users/${userId}/media-frames/${key}.json` };
  let result: FrameSet;
  try {
    const cached = await storage().send(new GetObjectCommand(location), { abortSignal: signal });
    if (!cached.Body) throw new Error("Saved video frames are unavailable.");
    result = frameSet.parse(JSON.parse(await cached.Body.transformToString()));
    log?.("frame-cache", { cache: "hit", count: result.frames.length });
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "NoSuchKey") throw error;
    log?.("frame-cache", { cache: "miss" });
    result = await withSource(async (url) => {
      const format = mediaInputFormat(node);
      const metadata = await probeMedia(url, format, signal);
      log?.("probe", { duration: metadata.duration, audioTracks: metadata.audioTracks, videoTracks: metadata.videoTracks });
      if (!metadata.duration || !metadata.hasVideo) throw new ApiError(422, "Video duration or visual track is unavailable.");
      const duration = metadata.videoDuration ?? metadata.duration;
      const end = Math.min(endSeconds ?? duration, duration);
      if (start >= end) throw new ApiError(400, "Choose a range inside this video.");
      if (!metadata.frameRate) throw new ApiError(422, "Video frame timing is unavailable. Upload a converted copy.");
      const times = [...new Set(videoSampleTimes(start, end, samples, strategy).map((time) => Math.floor(time * metadata.frameRate!) / metadata.frameRate!))];
      const frames: FrameSet["frames"] = [];
      for (let offset = 0; offset < times.length; offset += 4) {
        frames.push(...await Promise.all(times.slice(offset, offset + 4).map(async (time) => ({ time, image: Buffer.from(await imageFrame(url, time, format, signal)).toString("base64") }))));
      }
      return frameSet.parse({ duration, hasAudio: metadata.hasAudio, start, end, frames });
    });
    await storage().send(new PutObjectCommand({ ...location, Body: JSON.stringify(result), ContentType: "application/json" }), { abortSignal: signal });
  }
  log?.("frames-ready", { frames: result.frames.map((frame, index) => ({ index, time: frame.time, bytes: Buffer.byteLength(frame.image, "base64") })) });
  return { ...result, frames: result.frames.map(({ time, image }) => ({ time, bytes: Buffer.from(image, "base64") })) };
}
