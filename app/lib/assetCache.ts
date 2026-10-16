let registration: Promise<ServiceWorkerRegistration> | null = null;
let owner: string | null | undefined;
let listening = false;
const uploads = new Map<string, Blob>();
const warming = new Map<string, Promise<void>>();
let warmQueue = Promise.resolve();
let warmRevision = 0;

export class AssetCacheUnavailable extends Error {}
async function worker() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker || !globalThis.isSecureContext) throw new AssetCacheUnavailable("Asset caching requires HTTPS or localhost.");
  if (!listening) {
    listening = true;
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "asset-error") console.warn("Asset request failed: " + event.data.message);
      if (event.data?.type === "asset-owner-request") event.ports[0]?.postMessage({ owner: owner ?? null });
    });
  }
  registration ??= navigator.serviceWorker.register("/asset-worker.js", { type: "module", scope: "/", updateViaCache: "none" }).then(() => navigator.serviceWorker.ready).catch((error) => { registration = null; throw new AssetCacheUnavailable(error instanceof Error ? error.message : "Asset cache is unavailable."); });
  const result = await registration;
  if (!navigator.serviceWorker.controller) await new Promise<void>((resolve, reject) => {
    const controlled = () => { clearTimeout(deadline); resolve(); };
    const deadline = setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", controlled);
      reject(new AssetCacheUnavailable("Asset cache did not activate."));
    }, 10_000);
    navigator.serviceWorker.addEventListener("controllerchange", controlled, { once: true });
  });
  if (!result.active) throw new AssetCacheUnavailable("Asset cache is not active.");
  return result.active;
}
async function send(target: ServiceWorker, message: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const deadline = setTimeout(() => { channel.port1.close(); reject(new AssetCacheUnavailable("Asset cache did not respond.")); }, 30_000);
    channel.port1.onmessage = (event) => {
      clearTimeout(deadline);
      channel.port1.close();
      if (event.data?.ok === true) resolve();
      else reject(new Error(typeof event.data?.error === "string" ? event.data.error : "Asset cache failed."));
    };
    target.postMessage(message, [channel.port2]);
  });
}
export async function setAssetCacheOwner(next: string | null) {
  const previous = owner;
  owner = next;
  if (previous !== next) { uploads.clear(); warmRevision++; }
  try {
    const target = await worker();
    if (owner !== next) return;
    if (previous && previous !== next) await send(target, { type: "clear", owner: previous });
    if (next) await send(target, { type: "bind", owner: next });
    else await send(target, { type: "clear" });
  } catch (error) { console.warn("Asset caching unavailable", { message: error instanceof Error ? error.message : "Unknown error" }); }
}
export async function cachedAssetUrl(accountId: string, id: string) {
  const target = await worker();
  if (owner !== accountId) throw new Error("Account session changed.");
  await send(target, { type: "bind", owner: accountId });
  return `/__media__/${encodeURIComponent(accountId)}/${encodeURIComponent(id)}`;
}
export function uploadedAsset(accountId: string, id: string) { return uploads.get(`${accountId}/${id}`); }
export function cacheUploadedAsset(accountId: string, id: string, blob: Blob) {
  if (owner !== accountId) return;
  const key = `${accountId}/${id}`;
  uploads.set(key, blob);
  void worker().then(async (target) => {
    if (owner !== accountId) return;
    await send(target, { type: "bind", owner: accountId });
    await send(target, { type: "seed", owner: accountId, id, blob });
  }).catch((error) => console.warn("Uploaded asset cache unavailable", { message: error instanceof Error ? error.message : "Unknown error" })).finally(() => uploads.delete(key));
}
export function warmAsset(accountId: string, content: string) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!content.startsWith("cloud-file:") || owner !== accountId || connection?.saveData) return Promise.resolve();
  const id = content.slice(11), key = `${accountId}/${id}`;
  const pending = warming.get(key);
  if (pending) return pending;
  const revision = ++warmRevision;
  const task = warmQueue.then(async () => {
    if (owner !== accountId || revision !== warmRevision) return;
    const target = await worker();
    if (owner !== accountId || revision !== warmRevision) return;
    await send(target, { type: "bind", owner: accountId });
    await send(target, { type: "warm", owner: accountId, id });
  }).catch((error) => console.warn("Asset preload failed: " + (error instanceof Error ? error.message : "Unknown error"))).finally(() => warming.delete(key));
  warmQueue = task;
  warming.set(key, task);
  return task;
}
