import { apiRequest, object, refreshAccountSession } from "./accountApi.ts";
import { isLocalFile, readLocalFile } from "./localFiles.ts";
import type { RoomData } from "./types.ts";
import { AssetCacheUnavailable, cachedAssetUrl, uploadedAsset, cacheUploadedAsset } from "./assetCache.ts";

export const isCloudFile = (content: string) => content.startsWith("cloud-file:");
export async function fileRequest(path: string, init?: RequestInit): Promise<unknown> {
  return apiRequest(path, init, async (url, options) => {
    let response = await fetch(url, options);
    if (response.status === 401) {
      await refreshAccountSession();
      response = await fetch(url, options);
    }
    return response;
  });
}
export async function uploadCloudFile(blob: Blob, signal?: AbortSignal, cache = true): Promise<string> {
  signal?.throwIfAborted();
  const type = blob.type || "application/octet-stream";
  const result = object(await fileRequest("/api/files/upload", { method: "POST", signal, body: JSON.stringify({ size: blob.size, contentType: type }) }));
  if (typeof result.url !== "string" || typeof result.id !== "string") throw new Error("Invalid upload response.");
  const started = performance.now();
  console.info("File upload", { id: result.id, stage: "start", bytes: blob.size, contentType: type });
  let response: Response;
  try { response = await fetch(result.url, { method: "PUT", signal, headers: { "Content-Type": type }, body: blob }); }
  catch (error) { console.error("File upload", { id: result.id, stage: "failed", elapsedMs: Math.round(performance.now() - started) }); throw error; }
  if (!response.ok) {
    console.error("File upload", { id: result.id, stage: "failed", status: response.status, elapsedMs: Math.round(performance.now() - started) });
    throw new Error(`File upload failed (${response.status}). Try again.`);
  }
  console.info("File upload", { id: result.id, stage: "complete", bytes: blob.size, elapsedMs: Math.round(performance.now() - started) });
  if (cache && typeof result.ownerId === "string") cacheUploadedAsset(result.ownerId, result.id, blob);
  return `cloud-file:${result.id}`;
}
export async function browserFileUrl(content: string) {
  const result = object(await fileRequest(`/api/files?id=${encodeURIComponent(content.slice(11))}`));
  if (typeof result.url !== "string") throw new Error("Invalid file response.");
  return result.url;
}
export async function fileSource(content: string, accountId?: string): Promise<{ url: string; release?: () => void }> {
  if (isCloudFile(content) && accountId) {
    const blob = uploadedAsset(accountId, content.slice(11));
    if (blob) {
      const url = URL.createObjectURL(blob);
      return { url, release: () => URL.revokeObjectURL(url) };
    }
    try { return { url: await cachedAssetUrl(accountId, content.slice(11)) }; }
    catch (error) {
      if (!(error instanceof AssetCacheUnavailable)) throw error;
      console.warn("Asset caching unavailable", { message: error.message });
    }
  }
  if (isCloudFile(content)) return { url: await browserFileUrl(content) };
  if (content.startsWith("data:")) return { url: content };
  const blob = await readLocalFile(content);
  const url = URL.createObjectURL(blob);
  return { url, release: () => URL.revokeObjectURL(url) };
}
export async function readFileBlob(content: string, accountId?: string): Promise<Blob> {
  if (isLocalFile(content)) return readLocalFile(content);
  if (!isCloudFile(content) && !content.startsWith("data:")) throw new Error("File content is invalid.");
  const source = await fileSource(content, accountId);
  try {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`Cannot download file (${response.status}).`);
    return await response.blob();
  } finally { source.release?.(); }
}
export async function uploadRoomFiles(data: RoomData, uploaded: Map<string, string>, signal?: AbortSignal): Promise<RoomData> {
  async function upload(content: string) {
    if (isCloudFile(content)) return content;
    const previous = uploaded.get(content);
    if (previous) return previous;
    signal?.throwIfAborted();
    const next = await uploadCloudFile(await readFileBlob(content), signal);
    uploaded.set(content, next);
    return next;
  }
  const nodes = [];
  for (const node of data.nodes) {
    const content = node.content === undefined ? undefined : await upload(node.content);
    const versions = [];
    for (const version of node.versions ?? []) versions.push({ ...version, content: await upload(version.content) });
    nodes.push({ ...node, ...(content === undefined ? {} : { content }), ...(node.versions ? { versions } : {}) });
  }
  return { ...data, nodes };
}
