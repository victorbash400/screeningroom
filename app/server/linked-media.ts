import "server-only";
import { createHash } from "node:crypto";
import { parseLink, youtubeVideo } from "../lib/linkFiles";
import { mediaKind } from "../lib/mediaAnalysis";
import type { FileNode } from "../lib/types";
import { youtubeNode } from "./youtube-media";
import { withPublicMedia } from "./public-media";
import { ApiError } from "./http";

const extensions: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-matroska": "mkv", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/flac": "flac", "audio/ogg": "ogg", "application/ogg": "ogg", "audio/opus": "opus" };
export async function linkedMediaNode(value: string, signal?: AbortSignal): Promise<FileNode> {
  const url = parseLink(value);
  if (youtubeVideo(url)) return youtubeNode(value, signal);
  return withPublicMedia(value, "GET", async (response, resolved) => {
    const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    const extension = extensions[mimeType];
    const name = resolved.pathname.split("/").at(-1) || "Linked media";
    const revision = response.headers.get("etag") || response.headers.get("last-modified");
    const content = revision ? `linked-media:${createHash("sha256").update(JSON.stringify({ revision, length: response.headers.get("content-length"), mimeType })).digest("hex")}` : `linked-media:${crypto.randomUUID()}`;
    const node: FileNode = { content, id: `link:${createHash("sha256").update(url.href).digest("hex")}`, name: extension && !name.toLowerCase().endsWith(`.${extension}`) ? `${name}.${extension}` : name, kind: "file", workspaceId: "linked", parentId: null, updatedAt: new Date().toISOString(), sourceUrl: url.href, mimeType };
    if (!["audio", "video"].includes(mediaKind(node) ?? "") || mimeType.includes("text/html")) throw new ApiError(415, "Use a direct video or audio download link, or a public YouTube video.");
    return node;
  }, signal);
}
