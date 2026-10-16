import { AssetCache, cachePrefix } from "./asset-cache.js";

const owners = new Map();
const urls = new Map();
let refresh;
async function signedUrl(owner, id) {
  const key = `${owner}/${id}`;
  const cached = urls.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  let response = await fetch(`/api/files?id=${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401) {
    refresh ??= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" }).then(async (result) => { if (!result.ok) throw new Error("Cannot refresh the asset session."); }).finally(() => { refresh = undefined; });
    await refresh;
    response = await fetch(`/api/files?id=${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" });
  }
  const result = await response.json();
  if (!response.ok || result.ownerId !== owner || typeof result.url !== "string" || typeof result.expiresIn !== "number") throw new Error("Cannot access this asset.");
  urls.set(key, { url: result.url, expiresAt: Date.now() + Math.max(0, result.expiresIn - 5) * 1000 });
  return result.url;
}
async function clientOwner(id) {
  const client = await self.clients.get(id);
  if (!client) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const deadline = setTimeout(() => { channel.port1.close(); resolve(null); }, 5000);
    channel.port1.onmessage = (event) => { clearTimeout(deadline); channel.port1.close(); resolve(event.data?.owner ?? null); };
    client.postMessage({ type: "asset-owner-request" }, [channel.port2]);
  });
}
const assets = new AssetCache({ caches, fetch: (url, options) => fetch(url, options), getUrl: signedUrl, origin: self.location.origin });
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  event.waitUntil((async () => {
    try {
      const input = event.data;
      const client = event.source?.id;
      if (!client || !input || typeof input !== "object") throw new Error("Invalid asset cache request.");
      if (input.type === "bind" && typeof input.owner === "string") {
        owners.set(client, input.owner);
        assets.activate(input.owner);
      } else if (input.type === "clear") {
        if (typeof input.owner === "string") {
          await assets.clear(input.owner);
          for (const [id, owner] of owners) if (owner === input.owner) owners.delete(id);
          for (const key of urls.keys()) if (key.startsWith(input.owner + "/")) urls.delete(key);
        } else {
          owners.clear(); urls.clear();
          for (const name of await caches.keys()) if (name.startsWith(cachePrefix)) await assets.clear(name.slice(cachePrefix.length));
        }
      } else {
        if (owners.get(client) !== input.owner || typeof input.id !== "string") throw new Error("Account session changed.");
        if (input.type === "seed" && input.blob instanceof Blob) await assets.seed(input.owner, input.id, input.blob);
        else if (input.type === "warm") await assets.warm(input.owner, input.id);
        else throw new Error("Invalid asset cache action.");
      }
      event.ports[0]?.postMessage({ ok: true });
    } catch (error) { event.ports[0]?.postMessage({ error: error instanceof Error ? error.message : "Asset cache failed." }); }
  })());
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/__media__/")) return;
  event.respondWith((async () => {
    const parts = url.pathname.split("/");
    const owner = parts[2], id = parts[3];
    if (parts.length !== 4 || !owner || !id || !event.clientId || event.request.destination === "document" || await clientOwner(event.clientId) !== owner) return new Response("Account session changed.", { status: 403 });
    if (event.request.method !== "GET" && event.request.method !== "HEAD") return new Response(null, { status: 405 });
    try { return await assets.respond(owner, id, event.request); }
    catch (error) {
      const client = await self.clients.get(event.clientId);
      client?.postMessage({ type: "asset-error", message: error instanceof Error ? error.message : "Cannot load asset." });
      return new Response("Cannot load asset.", { status: 502 });
    }
  })());
});
