import { tool } from "ai";
import { z } from "zod";
import { entityType, qlooRequest } from "./qloo";

export const searchEntities = tool({
  description: "Search Qloo for real entity IDs by name. Resolve names before requesting recommendations. An empty result means no match; never invent an ID.",
  inputSchema: z.object({ query: z.string().trim().min(1).max(200), type: entityType, take: z.number().int().min(1).max(10).default(5) }),
  execute: ({ query, type, take }, { abortSignal }) => qlooRequest("/search", { query, types: `urn:entity:${type}`, take: String(take) }, abortSignal),
});
