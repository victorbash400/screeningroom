import "server-only";
import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { storage } from "./aws";
import { env } from "./config";
import { ApiError } from "./http";
import { imageFrame, mediaInputFormat, probeMedia } from "./media-processing";
import { sampleTimes } from "../lib/mediaAnalysis";
import type { FileNode } from "../lib/types";

const frameSet = z.object({ duration: z.number().positive(), hasAudio: z.boolean(), start: z.number().nonnegative(), end: z.number().positive(), frames: z.array(z.object({ time: z.number().nonnegative(), image: z.string().min(1) }).strict()).min(1).max(5) }).strict();
type FrameSet = z.infer<typeof frameSet>;
export async function videoFrames(userId: string, node: FileNode, samples: number, start: number, endSeconds: number | undefined, withSource: (prepare: (url: string) => Promise<FrameSet>) => Promise<FrameSet>, signal?: AbortSignal) {
  const key = createHash("sha256").update(JSON.stringify({ version: 1, content: node.content, samples, start, endSeconds })).digest("hex");
  const location = { Bucket: env("S3_BUCKET_NAME"), Key: `users/${userId}/media-frames/${key}.json` };
  let result: FrameSet;
  try {
    const cached = await storage().send(new GetObjectCommand(location), { abortSignal: signal });
    if (!cached.Body) throw new Error("Saved video frames are unavailable.");
    result = frameSet.parse(JSON.parse(await cached.Body.transformToString()));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "NoSuchKey") throw error;
    result = await withSource(async (url) => {
      const format = mediaInputFormat(node);
      const metadata = await probeMedia(url, format, signal);
      if (!metadata.duration || !metadata.hasVideo) throw new ApiError(422, "Video duration or visual track is unavailable.");
      const duration = metadata.videoDuration ?? metadata.duration;
      const end = Math.min(endSeconds ?? duration, duration);
      if (start >= end) throw new ApiError(400, "Choose a range inside this video.");
      if (!metadata.frameRate) throw new ApiError(422, "Video frame timing is unavailable. Upload a converted copy.");
      const times = [...new Set(sampleTimes(start, end, samples).map((time) => Math.floor(time * metadata.frameRate!) / metadata.frameRate!))];
      const frames = await Promise.all(times.map(async (time) => ({ time, image: Buffer.from(await imageFrame(url, time, format, signal)).toString("base64") })));
      return frameSet.parse({ duration, hasAudio: metadata.hasAudio, start, end, frames });
    });
    await storage().send(new PutObjectCommand({ ...location, Body: JSON.stringify(result), ContentType: "application/json" }), { abortSignal: signal });
  }
  return { ...result, frames: result.frames.map(({ time, image }) => ({ time, bytes: Buffer.from(image, "base64") })) };
}
