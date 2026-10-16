import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "node:dns/promises" && context.parentURL?.endsWith("/aws-dns.ts")) return {
    url: `data:text/javascript,${encodeURIComponent('export class Resolver {constructor(options){globalThis.dnsFixture.options=options}async resolve4(host,options){globalThis.dnsFixture.calls.push({host,options});return await globalThis.dnsFixture.resolve(host)}}')}`,
    shortCircuit: true,
  };
  return next(specifier, context);
} });
globalThis.dnsFixture = { calls: [], resolve: async () => [{ address: "192.0.2.1", ttl: 60 }] };
const { awsLookup } = await import("../app/server/aws-dns.ts");
const lookup = (host, options = {}) => new Promise((resolve, reject) => awsLookup(host, options, (error, address, family) => error ? reject(error) : resolve({ address, family })));
test("AWS DNS caches IPv4 answers for their TTL and supports Node's all-address lookup", async () => {
  const result = await lookup("cache.example", { all: true });
  assert.deepEqual(result.address, [{ address: "192.0.2.1", family: 4 }]);
  assert.deepEqual(await lookup("cache.example"), { address: "192.0.2.1", family: 4 });
  assert.equal(globalThis.dnsFixture.calls.filter((call) => call.host === "cache.example").length, 1);
  assert.deepEqual(globalThis.dnsFixture.options, { timeout: 2000, tries: 1 });
});
test("simultaneous AWS requests share a single DNS resolution", async () => {
  let release;
  globalThis.dnsFixture.resolve = () => new Promise((resolve) => { release = resolve; });
  const first = lookup("shared.example"), second = lookup("shared.example");
  release([{ address: "192.0.2.2", ttl: 60 }]);
  await Promise.all([first, second]);
  assert.equal(globalThis.dnsFixture.calls.filter((call) => call.host === "shared.example").length, 1);
});
test("expired DNS records are refreshed instead of pinned indefinitely", async () => {
  globalThis.dnsFixture.resolve = async () => [{ address: "192.0.2.3", ttl: 0 }];
  await lookup("expired.example");
  await lookup("expired.example");
  assert.equal(globalThis.dnsFixture.calls.filter((call) => call.host === "expired.example").length, 2);
});
test("DNS failures surface and do not poison future explicit requests", async () => {
  globalThis.dnsFixture.resolve = async () => { throw Object.assign(new Error("DNS unavailable"), { code: "ETIMEOUT" }); };
  await assert.rejects(lookup("failure.example"), { code: "ETIMEOUT" });
  globalThis.dnsFixture.resolve = async () => [{ address: "192.0.2.4", ttl: 60 }];
  assert.equal((await lookup("failure.example")).address, "192.0.2.4");
});
