import "server-only";
import { z } from "zod";
import { env } from "../server/config";
import { ApiError } from "../server/http";

const optionalText = z.string().nullish().transform((value) => value ?? undefined);

export const entityType = z.enum(["movie", "tv_show", "person", "place", "destination", "brand", "artist", "book", "podcast", "videogame"]);
const entity = z.object({
  entity_id: z.string(), name: z.string(),
  location: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).nullish(),
  types: z.array(z.string()).nullish().transform((value) => value ?? undefined), subtype: optionalText,
  properties: z.object({
    address: optionalText, description: optionalText,
    release_year: z.number().nullish().transform((value) => value ?? undefined), website: optionalText,
    image: z.object({ url: optionalText }).nullish().transform((value) => value?.url ? { url: value.url } : undefined),
    geocode: z.unknown().optional(),
  }).nullish().transform((value) => value ?? undefined),
  query: z.unknown().optional(),
});
const searchResponse = z.object({ results: z.array(entity) });
const insightsResponse = z.object({ success: z.literal(true), results: z.object({ entities: z.array(entity) }) });

export async function qlooRequest(path: "/search" | "/v2/insights", parameters: Record<string, string>, signal?: AbortSignal) {
  const base = new URL(env("QLOO_HACKATHON_API_SERVER_URL"));
  if (base.protocol !== "https:" || base.username || base.password) throw new Error("Configure a secure Qloo API URL.");
  const url = new URL(path, base);
  url.search = new URLSearchParams(parameters).toString();
  const response = await fetch(url, {
    headers: { "X-Api-Key": env("QLOO_HACKATHON_API_KEY"), Accept: "application/json" },
    cache: "no-store", redirect: "error",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Qloo request failed (${response.status}).`);
  const value: unknown = await response.json();
  if (path === "/search") {
    const parsed = searchResponse.safeParse(value);
    if (parsed.success) return parsed.data.results;
    console.error("Invalid Qloo search response", parsed.error.issues.map(({ path, code }) => ({ path, code })));
  } else {
    const parsed = insightsResponse.safeParse(value);
    if (parsed.success) return parsed.data.results.entities;
    console.error("Invalid Qloo insights response", parsed.error.issues.map(({ path, code }) => ({ path, code })));
  }
  throw new ApiError(502, "Qloo returned invalid results. Try again.");
}
