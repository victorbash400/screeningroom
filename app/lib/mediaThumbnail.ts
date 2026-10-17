import type { FileNode } from "./types.ts";

export function thumbnailKind(node: FileNode): "image" | "video" | undefined {
  if (node.kind !== "file" || !node.content || node.sourceUrl) return;
  if (node.mimeType?.startsWith("image/")) return "image";
  if (node.mimeType?.startsWith("video/")) return "video";
  const extension = node.name.slice(node.name.lastIndexOf(".") + 1).toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "bmp", "heic", "heif"].includes(extension)) return "image";
  if (["mp4", "mov", "m4v", "webm", "ogg"].includes(extension)) return "video";
}

export function thumbnailSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("Cannot read media dimensions.");
  const scale = Math.min(1, 640 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function createMediaThumbnail(source: string, kind: "image" | "video", signal: AbortSignal) {
  signal.throwIfAborted();
  const media = kind === "image" ? new Image() : document.createElement("video");
  media.crossOrigin = "anonymous";
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      const finish = (width: number, height: number) => {
        signal.removeEventListener("abort", abort);
        resolve({ width, height });
      };
      media.onerror = () => { signal.removeEventListener("abort", abort); reject(new Error("Cannot create a thumbnail for this file.")); };
      if (media instanceof HTMLVideoElement) {
        media.muted = true;
        media.preload = "metadata";
        media.playsInline = true;
        let seeking = false;
        media.onloadedmetadata = () => {
          const time = Number.isFinite(media.duration) ? Math.min(1, media.duration / 10) : 0;
          if (time > 0) { seeking = true; media.currentTime = time; }
        };
        media.onseeked = () => finish(media.videoWidth, media.videoHeight);
        media.onloadeddata = () => { if (!seeking) finish(media.videoWidth, media.videoHeight); };
      } else media.onload = () => finish(media.naturalWidth, media.naturalHeight);
      media.src = source;
    });
    signal.throwIfAborted();
    const size = thumbnailSize(dimensions.width, dimensions.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Thumbnail rendering is unavailable.");
    context.drawImage(media, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Cannot encode thumbnail.")), "image/webp", 0.82,
    ));
    signal.throwIfAborted();
    return { blob, ...size };
  } finally {
    media.onerror = null;
    if (media instanceof HTMLVideoElement) {
      media.onloadedmetadata = null; media.onseeked = null; media.onloadeddata = null;
      media.removeAttribute("src"); media.load();
    } else { media.onload = null; media.removeAttribute("src"); }
  }
}
