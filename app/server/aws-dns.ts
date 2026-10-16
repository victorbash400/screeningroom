import "server-only";
import { Resolver } from "node:dns/promises";
import type { LookupFunction } from "node:net";

const resolver = new Resolver({ timeout: 2_000, tries: 1 });
const cache = new Map<string, { addresses: string[]; expiresAt: number }>();
const pending = new Map<string, Promise<string[]>>();

async function addressesFor(hostname: string): Promise<string[]> {
  const cached = cache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;
  const existing = pending.get(hostname);
  if (existing) return existing;
  const request = resolver.resolve4(hostname, { ttl: true }).then((records) => {
    if (!records.length) throw new Error("AWS DNS returned no IPv4 addresses.");
    const addresses = records.map((record) => record.address);
    const ttl = Math.min(60, ...records.map((record) => record.ttl));
    cache.set(hostname, { addresses, expiresAt: Date.now() + ttl * 1000 });
    return addresses;
  }).finally(() => pending.delete(hostname));
  pending.set(hostname, request);
  return request;
}

export const awsLookup: LookupFunction = (hostname, options, callback) => {
  void addressesFor(hostname).then((addresses) => {
    if (options.all) callback(null, addresses.map((address) => ({ address, family: 4 })));
    else callback(null, addresses[0], 4);
  }, (error: NodeJS.ErrnoException) => callback(error, "", 4));
};
