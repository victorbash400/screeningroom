import "server-only";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import ffmpeg from "ffmpeg-static";
import { parseLink, youtubeVideo } from "../lib/linkFiles";
import { ApiError } from "./http";
import type { FileNode } from "../lib/types";
import type { MediaLog } from "./media-diagnostics";

const metadataSchema = z.object({ id: z.string(), title: z.string(), description: z.string().nullish(), channel: z.string().nullish(), duration: z.number().positive(), webpage_url: z.string().url() });
const metadata = new Map<string, { expires: number; value: z.infer<typeof metadataSchema> }>();
const pending = new Map<string, Promise<z.infer<typeof metadataSchema>>>();
export function youtubeUrl(value: string) {
  const id = youtubeVideo(parseLink(value));
  if (!id) throw new ApiError(400, "Use a YouTube video link, or upload the media file.");
  return { id, url: `https://www.youtube.com/watch?v=${id}` };
}
function run(args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
    const bundled = join(process.cwd(), ".media-bin", binaryName);
    execFile(/* turbopackIgnore: true */ process.env.YTDLP_PATH || (process.platform === "linux" || existsSync(bundled) ? bundled : binaryName), ["--ignore-config", "--js-runtimes", `node:${process.execPath}`, "--cache-dir", join(tmpdir(), "screeningroom-ytdlp-cache"), "--no-playlist", "--no-warnings", "--socket-timeout", "15", "--retries", "0", "--extractor-retries", "0", ...args], { signal, timeout: 120_000, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }, (error, stdout) => {
      if (error) {
        if (signal?.aborted) { reject(signal.reason); return; }
        console.error("YouTube processing failed", { code: error.code, signal: error.signal, platform: process.platform, architecture: process.arch });
        reject(new ApiError(error.code === "ENOENT" ? 503 : 422, error.code === "ENOENT" ? "YouTube processing is unavailable on this server. Configure yt-dlp or upload the video." : "YouTube could not provide this public video. Upload the video or its transcript."));
        return;
      }
      resolve(stdout);
    });
  });
}
export async function youtubeMetadata(value: string, signal?: AbortSignal) {
  const { id, url } = youtubeUrl(value);
  signal?.throwIfAborted();
  for (const [key, entry] of metadata) if (entry.expires <= Date.now()) metadata.delete(key);
  const cached = metadata.get(id);
  if (cached && cached.expires > Date.now()) return cached.value;
  let request = signal ? undefined : pending.get(id);
  if (!request) {
    request = run(["--skip-download", "--dump-single-json", url], signal).then((text) => {
      const result = metadataSchema.parse(JSON.parse(text));
      if (result.id !== id) throw new ApiError(502, "YouTube returned a different video.");
      metadata.set(id, { value: result, expires: Date.now() + 1_800_000 });
      return result;
    });
    if (!signal) pending.set(id, request);
  }
  try { return await request; } finally { if (pending.get(id) === request) pending.delete(id); }
}
export async function youtubeNode(value: string, signal?: AbortSignal): Promise<FileNode> {
  const { id, url } = youtubeUrl(value);
  const info = await youtubeMetadata(url, signal);
  return { id: `youtube:${id}`, name: `${info.title}.mp4`, kind: "file", workspaceId: "linked", parentId: null, updatedAt: new Date().toISOString(), sourceUrl: url, mimeType: "video/mp4" };
}
export async function withYoutubeMedia<T>(value: string, runAnalysis: (withSource: <R>(operation: (path: string) => Promise<R>) => Promise<R>) => Promise<T>, signal?: AbortSignal, log?: MediaLog): Promise<T> {
  const { url } = youtubeUrl(value);
  let directory: string | undefined;
  let prepared: Promise<string> | undefined;
  async function prepare() {
    directory = await mkdtemp(join(tmpdir(), "screeningroom-youtube-"));
    const path = join(directory, "input.mp4");
    log?.("source-download");
    // Prefer a combined preview; otherwise remux separate video and audio without re-encoding.
    if (!ffmpeg) throw new ApiError(503, "YouTube audio/video processing is unavailable on this server.");
    await run(["--no-progress", "--no-part", "--ffmpeg-location", ffmpeg, "--merge-output-format", "mp4", "--format", "best[height<=480][ext=mp4][acodec!=none]/bestvideo[height<=480][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]", "--output", path, url], signal);
    log?.("source-ready", { bytes: (await stat(path)).size });
    return path;
  }
  try { return await runAnalysis(async (operation) => operation(await (prepared ??= prepare()))); }
  finally { if (directory) await rm(directory, { recursive: true, force: true }); }
}
