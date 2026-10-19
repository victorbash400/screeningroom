import "server-only";
import { qlooRequest } from "../tools/qloo";
import type { DigitalPlatform } from "../lib/digitalPlatforms";
import { ApiError } from "./http";

type Resolution = { entity?: Awaited<ReturnType<typeof qlooRequest>>[number]; resultCount: number };
const resolved = new Map<string, { expires: number; value: Resolution }>();
const pending = new Map<string, Promise<Resolution>>();

export async function resolvePlatform(platform: DigitalPlatform, signal?: AbortSignal): Promise<Resolution & { cached: boolean }> {
  signal?.throwIfAborted();
  const cached = resolved.get(platform.id);
  if (cached && cached.expires > Date.now()) return { ...cached.value, cached: true };
  const existing = pending.get(platform.id);
  if (existing) return { ...await existing, cached: true };
  const request = (async () => {
    // Public brand identities are shared; one chat's cancellation must not cancel another's lookup.
    const matches = await qlooRequest("/search", { query: platform.name, types: "urn:entity:brand", take: "5" });
    const exact = matches.filter((item) => item.name.toLocaleLowerCase() === platform.name.toLocaleLowerCase());
    if (exact.length > 1) throw new ApiError(409, `Qloo returned ambiguous matches for ${platform.name}. Resolve its identity before ranking it.`);
    const value = { entity: exact[0], resultCount: matches.length };
    resolved.set(platform.id, { value, expires: Date.now() + 86_400_000 });
    return value;
  })();
  pending.set(platform.id, request);
  try { return { ...await request, cached: false }; } finally { pending.delete(platform.id); }
}
