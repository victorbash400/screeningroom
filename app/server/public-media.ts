import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as remoteFetch } from "undici";
import { parseLink } from "../lib/linkFiles";
import { ApiError } from "./http";

const blocked = new BlockList();
for (const [address, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
export function publicAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4") : family === 6 && globalV6.check(address, "ipv6");
}
export function publicMediaUrl(value: string) {
  const url = parseLink(value);
  if (url.protocol !== "https:" || url.port && url.port !== "443") throw new ApiError(400, "Use a public HTTPS media link.");
  return url;
}

// Pin validated DNS answers for each connection, including every redirect.
export async function withPublicMedia<T>(value: string, method: "GET" | "HEAD", consume: (response: Response, url: URL) => Promise<T>, signal?: AbortSignal): Promise<T> {
  let url = publicMediaUrl(value);
  for (let redirects = 0; redirects <= 5; redirects++) {
    signal?.throwIfAborted();
    const hostname = url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new ApiError(400, "Use a public media host.");
    const dispatcher = new Agent({ connect: { lookup: (_hostname, options, callback) => {
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    } } });
    try {
      const response = await remoteFetch(url, { method, redirect: "manual", dispatcher, headers: { Accept: "video/*, audio/*, application/octet-stream", "User-Agent": "Screeningroom/0.1" }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000) });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new ApiError(502, "Media redirect has no destination.");
        url = publicMediaUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new ApiError(422, `Media link returned ${response.status}. Use a public download link.`); }
      try { return await consume(response as unknown as Response, url); }
      finally { if (!response.bodyUsed) await response.body?.cancel(); }
    } finally { await dispatcher.close(); }
  }
  throw new ApiError(422, "Media link has too many redirects.");
}
