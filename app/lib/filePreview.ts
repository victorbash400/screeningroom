import type { FileNode } from "./types";
import { isTextFile, readTextContent } from "./fileTypes.ts";
import { parseLink, youtubeVideo } from "./linkFiles.ts";
import { isLocalFile } from "./localFiles.ts";
export type Preview =
  | { kind: "text"; text: string }
  | {
      kind: "image" | "video" | "audio" | "pdf" | "youtube" | "link";
      source: string;
    };
export function filePreview(node: FileNode): Preview {
  if (node.sourceUrl) {
    const url = parseLink(node.sourceUrl);
    const video = youtubeVideo(url);
    if (video)
      return {
        kind: "youtube",
        source: `https://www.youtube-nocookie.com/embed/${video}`,
      };
    const dot = url.pathname.lastIndexOf(".");
    const extension = dot < 0 ? "" : url.pathname.slice(dot + 1).toLowerCase();
    const kind = ["mp4", "webm", "mov", "m4v"].includes(extension)
      ? "video"
      : ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)
        ? "audio"
        : ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(
              extension,
            )
          ? "image"
          : extension === "pdf"
            ? "pdf"
            : "link";
    return { kind, source: url.href };
  }
  if (node.kind !== "file" || !node.content)
    throw new Error("File content is unavailable.");
  const comma = node.content.indexOf(",");
  if (
    !isLocalFile(node.content) &&
    (!node.content.startsWith("data:") || comma < 0)
  )
    throw new Error("File content is invalid.");
  const header = isLocalFile(node.content)
    ? (node.mimeType?.toLowerCase() ?? "")
    : node.content.slice(5, comma).split(";")[0].toLowerCase();
  if (isTextFile(node.name, header))
    return {
      kind: "text",
      text: isLocalFile(node.content) ? "" : readTextContent(node.content),
    };
  if (header === "application/pdf")
    return { kind: "pdf", source: node.content };
  if (
    [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/avif",
      "image/svg+xml",
      "image/bmp",
    ].includes(header)
  )
    return { kind: "image", source: node.content };
  if (
    ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(header)
  )
    return { kind: "video", source: node.content };
  if (
    [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
      "audio/aac",
      "audio/flac",
    ].includes(header)
  )
    return { kind: "audio", source: node.content };
  throw new Error("Preview unavailable for this file type.");
}
