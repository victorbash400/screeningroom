import "server-only";
import { z } from "zod";
import { env } from "../server/config";

export const entityType = z.enum(["movie", "tv_show", "person", "place", "destination", "brand", "artist", "book", "podcast", "videogame"]);
const entity = z.object({
  entity_id: z.string(), name: z.string(),
  types: z.array(z.string()).optional(), subtype: z.string().optional(),
  properties: z.object({
    address: z.string().optional(), description: z.string().optional(),
    release_year: z.number().optional(), website: z.string().optional(),
    image: z.object({ url: z.string() }).nullish(),
    geocode: z.unknown().optional(),
  }).optional(),
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
  return path === "/search" ? searchResponse.parse(value).results : insightsResponse.parse(value).results.entities;
}
