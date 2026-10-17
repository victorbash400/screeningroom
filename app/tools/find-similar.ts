import { tool } from "ai";
import { z } from "zod";
import { entityType, qlooRequest } from "./qloo";
import { publicWebUrl, similarResultsSchema } from "../lib/similarResults";

export const findSimilar = tool({
  description: "Get Qloo taste-related recommendations and show their catalogue images in chat when available. Resolve the user's named references with searchEntities first. These results reflect taste affinity, not visual matching, web image search, or predicted sales. Do not invent images, links or scores.",
  inputSchema: z.object({ type: entityType, entityIds: z.array(z.uuid()).min(1), take: z.number().int().min(1).max(100).default(6) }),
  execute: async ({ type, entityIds, take }, { abortSignal }) => {
    const entities = await qlooRequest("/v2/insights", {
      "filter.type": `urn:entity:${type}`, "signal.interests.entities": entityIds.join(","),
      "filter.exclude.entities": entityIds.join(","), take: String(take),
    }, abortSignal);
    return similarResultsSchema.parse(entities.map(({ entity_id, name, properties }) => ({
      id: entity_id, name,
      ...(publicWebUrl.safeParse(properties?.image?.url).success ? { image: properties!.image!.url } : {}),
      ...(publicWebUrl.safeParse(properties?.website).success ? { website: properties!.website } : {}),
      ...(properties?.release_year !== undefined ? { year: properties.release_year } : {}),
      ...(properties?.description ? { description: properties.description } : {}),
    })));
  },
});
