import {
  Archive,
  File,
  FileCode,
  FileImage,
  FileText,
  Film,
  Music,
  Link2,
  SquarePlay,
} from "lucide-react";
import { parseLink, youtubeVideo } from "./linkFiles.ts";
import { isLocalFile, readLocalFile } from "./localFiles.ts";
const textExtensions = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "yaml",
  "yml",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "tsx",
  "jsx",
  "dart",
  "swift",
  "py",
  "rs",
  "go",
  "c",
  "h",
  "cpp",
  "sh",
  "toml",
  "ini",
  "log",
  "sql",
]);
function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}
export function isTextFile(name: string, mimeType?: string) {
  return (
    mimeType?.startsWith("text/") ||
    ["application/json", "application/xml", "application/yaml"].includes(
      mimeType ?? "",
    ) ||
    ["readme", "license", "makefile", "dockerfile"].includes(
      name.toLowerCase(),
    ) ||
    textExtensions.has(extension(name))
  );
}
export function fileIcon(name: string, sourceUrl?: string, mimeType?: string) {
  if (sourceUrl) return youtubeVideo(parseLink(sourceUrl)) ? SquarePlay : Link2;
  if (mimeType?.startsWith("video/")) return Film;
  if (mimeType?.startsWith("audio/")) return Music;
  if (mimeType?.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType?.startsWith("text/")) return FileText;
  const ext = extension(name);
  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "heic",
      "heif",
      "avif",
      "tif",
      "tiff",
      "bmp",
      "svg",
      "dng",
    ].includes(ext)
  )
    return FileImage;
  if (
    [
      "mov",
      "mp4",
      "m4v",
      "webm",
      "mkv",
      "avi",
      "mpeg",
      "mpg",
      "mts",
      "mxf",
    ].includes(ext)
  )
    return Film;
  if (
    [
      "mp3",
      "wav",
      "aiff",
      "aif",
      "flac",
      "m4a",
      "aac",
      "ogg",
      "opus",
      "caf",
    ].includes(ext)
  )
    return Music;
  if (
    [
      "md",
      "markdown",
      "txt",
      "pdf",
      "rtf",
      "doc",
      "docx",
      "odt",
      "pages",
    ].includes(ext)
  )
    return FileText;
  if (
    [
      "json",
      "yaml",
      "yml",
      "xml",
      "html",
      "css",
      "js",
      "ts",
      "tsx",
      "jsx",
      "dart",
      "swift",
      "py",
      "rs",
      "go",
      "c",
      "h",
      "cpp",
      "sh",
      "toml",
      "ini",
      "sql",
    ].includes(ext)
  )
    return FileCode;
  if (["zip", "tar", "gz", "bz2", "xz", "7z", "rar"].includes(ext))
    return Archive;
  return File;
}
export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
export function readTextContent(content: string) {
  const comma = content.indexOf(",");
  if (!content.startsWith("data:") || comma < 0)
    throw new Error("File content is invalid.");
  if (!content.slice(0, comma).endsWith(";base64"))
    return decodeURIComponent(content.slice(comma + 1));
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(content.slice(comma + 1)), (char) =>
      char.charCodeAt(0),
    ),
  );
}
export async function downloadFile(name: string, content: string) {
  let blob: Blob;
  if (isLocalFile(content)) blob = await readLocalFile(content);
  else {
    if (!content.startsWith("data:"))
      throw new Error("File content is invalid.");
    blob = await (await fetch(content)).blob();
  }
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
