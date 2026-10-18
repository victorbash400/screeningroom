import "server-only";
import { createHash } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { mediaAnalysisSchema, type MediaAnalysis } from "../lib/mediaAnalysis";
import { storage } from "./aws";
import type { MediaLog } from "./media-diagnostics";
import { env } from "./config";

export async function cachedMediaAnalysis(userId: string, identity: unknown, analyze: () => Promise<MediaAnalysis>, signal?: AbortSignal, log?: MediaLog) {
  const hash = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
  const location = { Bucket: env("S3_BUCKET_NAME"), Key: `users/${userId}/media-analysis/${hash}.json` };
  try {
    const cached = await storage().send(new GetObjectCommand(location), { abortSignal: signal });
    if (!cached.Body) throw new Error("Saved media analysis is unavailable.");
    const result = mediaAnalysisSchema.parse(JSON.parse(await cached.Body.transformToString()));
    log?.("analysis-cache", { cache: "hit", count: result.segments.length });
    return result;
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "NoSuchKey") throw error;
  }
  log?.("analysis-cache", { cache: "miss" });
  const result = mediaAnalysisSchema.parse(await analyze());
  await storage().send(new PutObjectCommand({ ...location, Body: JSON.stringify(result), ContentType: "application/json" }), { abortSignal: signal });
  return result;
}
