import "server-only";
import { parseLink, youtubeVideo } from "../lib/linkFiles";
import { withPublicMedia } from "./public-media";
import { withYoutubeMedia } from "./youtube-media";
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
  if (node.sourceUrl && youtubeVideo(parseLink(node.sourceUrl))) return withYoutubeMedia(node.sourceUrl, run, signal, log);
  if (!node.sourceUrl && (node.kind !== "file" || !node.content?.startsWith("cloud-file:"))) throw new ApiError(400, "Upload the media file before analyzing it.");
  let directory: string | undefined, prepared: Promise<string> | undefined;
  async function prepare() {
    directory = await mkdtemp(join(tmpdir(), "screeningroom-media-"));
    const path = join(directory, "input");
    log?.("source-download");
    if (node.sourceUrl) {
      return withPublicMedia(node.sourceUrl, "GET", async (response) => {
        if (!response.body) throw new ApiError(422, "Media link returned no content.");
        const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        if (type?.startsWith("text/") || type === "application/json") throw new ApiError(415, "Use a direct audio or video download link.");
        let received = 0;
        const limit = 512 * 1024 * 1024;
        const length = Number(response.headers.get("content-length"));
        if (length > limit) { await response.body.cancel(); throw new ApiError(413, "Linked media exceeds 512 MB. Upload the file instead."); }
        const counter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
          received += chunk.length;
          callback(received > limit ? new ApiError(413, "Linked media exceeds 512 MB. Upload the file instead.") : null, chunk);
        } });
        await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), counter, createWriteStream(path), { signal });
        log?.("source-ready", { bytes: received });
        return path;
      }, signal);
    }
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
