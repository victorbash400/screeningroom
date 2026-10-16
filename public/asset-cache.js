import { requestedRange, storageRange } from "./asset-range.js";

export const chunkBytes = 1024 * 1024;
export const cachePrefix = "screeningroom-assets-v1-";

export class AssetCache {
  pending = new Map();
  revoked = new Set();
  constructor({ caches, fetch, getUrl, origin, warn = console.warn }) {
    this.caches = caches;
    this.fetch = fetch;
    this.getUrl = getUrl;
    this.origin = origin;
    this.warn = warn;
  }
  key(owner, id, suffix) { return `${this.origin}/__asset_cache__/${owner}/${id}/${suffix}`; }
  activate(owner) { this.revoked.delete(owner); }
  check(owner) { if (this.revoked.has(owner)) throw new Error("Account session changed."); }
  async clear(owner) {
    this.revoked.add(owner);
    await this.caches.delete(cachePrefix + owner);
  }
  async put(cache, key, response) {
    try { await cache.put(key, response.clone()); }
    catch (error) {
      if (error?.name === "QuotaExceededError") {
        const oldest = (await cache.keys()).find((request) => request.url.includes("/chunk/"));
        if (oldest) {
          await cache.delete(oldest);
          try { await cache.put(key, response); return; } catch { /* Streaming continues when the disposable cache is full. */ }
        }
      }
      this.warn("Asset cache could not store a chunk", { name: error?.name });
    }
  }
  async chunk(owner, id, offset) {
    this.check(owner);
    const cache = await this.caches.open(cachePrefix + owner);
    const key = this.key(owner, id, `chunk/${offset}`);
    const cached = await cache.match(key);
    if (cached) return cached;
    const pending = this.pending.get(key);
    if (pending) return (await pending).clone();
    const task = (async () => {
      const url = await this.getUrl(owner, id);
      this.check(owner);
      const response = await this.fetch(url, { headers: { Range: `bytes=${offset}-${offset + chunkBytes - 1}` } });
      if (response.status === 416 && response.headers.get("Content-Range") === "bytes */0") {
        const empty = new Response(null, { headers: { "Content-Type": response.headers.get("Content-Type") || "application/octet-stream", "X-Asset-Size": "0" } });
        await this.put(cache, this.key(owner, id, "metadata"), Response.json({ size: 0, type: empty.headers.get("Content-Type") }));
        return empty;
      }
      if (response.status !== 206) { await response.body?.cancel(); throw new Error(`Asset range request failed (${response.status}).`); }
      const range = storageRange(response.headers.get("Content-Range"));
      if (range.start !== offset || range.end >= offset + chunkBytes) { await response.body?.cancel(); throw new Error("Storage returned the wrong byte range."); }
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== range.end - range.start + 1) throw new Error("Asset chunk is incomplete.");
      this.check(owner);
      const type = response.headers.get("Content-Type") || "application/octet-stream";
      const result = new Response(bytes, { headers: { "Content-Type": type, "X-Asset-Size": String(range.size) } });
      await this.put(cache, key, result);
      await this.put(cache, this.key(owner, id, "metadata"), Response.json({ size: range.size, type }));
      return result;
    })().finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return (await task).clone();
  }
  async info(owner, id) {
    this.check(owner);
    const cache = await this.caches.open(cachePrefix + owner);
    const stored = await cache.match(this.key(owner, id, "metadata"));
    if (stored) return stored.json();
    const first = await this.chunk(owner, id, 0);
    return { size: Number(first.headers.get("X-Asset-Size")), type: first.headers.get("Content-Type") };
  }
  async seed(owner, id, blob) {
    this.check(owner);
    const cache = await this.caches.open(cachePrefix + owner);
    const type = blob.type || "application/octet-stream";
    for (let offset = 0; offset < blob.size; offset += chunkBytes) {
      this.check(owner);
      await this.put(cache, this.key(owner, id, `chunk/${offset}`), new Response(blob.slice(offset, offset + chunkBytes), { headers: { "Content-Type": type, "X-Asset-Size": String(blob.size) } }));
    }
    this.check(owner);
    await this.put(cache, this.key(owner, id, "metadata"), Response.json({ size: blob.size, type }));
  }
  async warm(owner, id) {
    const info = await this.info(owner, id);
    if (info.size > chunkBytes) await this.chunk(owner, id, Math.floor((info.size - 1) / chunkBytes) * chunkBytes);
  }
  async respond(owner, id, request) {
    const { size, type } = await this.info(owner, id);
    const range = requestedRange(request.headers.get("Range"), size);
    if (!range) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const headers = { "Content-Type": type, "Content-Length": String(Math.max(0, range.end - range.start + 1)), "Accept-Ranges": "bytes", "Cache-Control": "private, no-store" };
    if (range.partial) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
    let position = range.start, cancelled = false;
    const stream = new ReadableStream({
      pull: async (controller) => {
        if (cancelled) return;
        try {
          this.check(owner);
          if (position > range.end) { controller.close(); return; }
          const offset = Math.floor(position / chunkBytes) * chunkBytes;
          const part = await this.chunk(owner, id, offset);
          const bytes = new Uint8Array(await part.arrayBuffer());
          if (cancelled) return;
          const end = Math.min(range.end + 1, offset + bytes.length);
          controller.enqueue(bytes.slice(position - offset, end - offset));
          position = end;
        } catch (error) { if (!cancelled) controller.error(error); }
      },
      cancel: () => { cancelled = true; },
    }, { highWaterMark: 0 });
    return new Response(request.method === "HEAD" ? null : stream, { status: range.partial ? 206 : 200, headers });
  }
}
