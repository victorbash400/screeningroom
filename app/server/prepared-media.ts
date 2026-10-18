import "server-only";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { storage } from "./aws";
import { env } from "./config";
import { objectKey } from "./files";
import { ApiError } from "./http";
import type { FileNode } from "../lib/types";
import type { MediaLog } from "./media-diagnostics";

type Source = <T>(operation: (source: string) => Promise<T>) => Promise<T>;
export async function withPreparedMedia<T>(userId: string, node: FileNode, run: (withSource: Source) => Promise<T>, signal?: AbortSignal, log?: MediaLog) {
  if (node.kind !== "file" || !node.content?.startsWith("cloud-file:")) throw new ApiError(400, "Upload the media file before analyzing it.");
  let directory: string | undefined, prepared: Promise<string> | undefined;
  async function prepare() {
    directory = await mkdtemp(join(tmpdir(), "screeningroom-media-"));
    const path = join(directory, "input");
    log?.("source-download");
    const result = await storage().send(new GetObjectCommand({ Bucket: env("S3_BUCKET_NAME"), Key: objectKey(userId, node.content!.slice(11)) }), { abortSignal: signal });
    if (!result.Body) throw new ApiError(404, "Media content is unavailable.");
    if (!(result.Body instanceof Readable)) throw new ApiError(503, "Media storage did not return a readable server stream.");
    let received = 0, reported = 0;
    const progress = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received - reported >= 16 * 1024 * 1024) { reported = received; log?.("source-progress", { bytes: received }); }
      callback(null, chunk);
    } });
    await pipeline(result.Body, progress, createWriteStream(path), { signal });
    log?.("source-ready", { bytes: received });
    return path;
  }
  try { return await run(async (operation) => operation(await (prepared ??= prepare()))); }
  finally { if (directory) await rm(directory, { recursive: true, force: true }); }
}
