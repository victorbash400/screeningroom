import { digitalPlatforms } from "../lib/digitalPlatforms";
import { tool } from "ai";
import { z } from "zod";
import { qlooRequest } from "./qloo";
import { comparisonWidgetSchema, type ComparisonWidget } from "../lib/researchWidget";
import { publicWebUrl } from "../lib/similarResults";
import { ApiError } from "../server/http";

export function digitalPlatformFitTool(remember: (widget: ComparisonWidget) => ComparisonWidget) {
  return tool({
    description: "Assess cultural affinity between a work's resolved media/tag proxies and online platforms represented as Qloo brands. Choose relevant catalogue platform IDs based on the understood work. The tool resolves those platform names itself; do not repeat brand searches or ask the user to select catalogue cards. Always supply resolved comparable media IDs or real taste tags. Select plausible platforms for the medium; ask about release format or territory if it changes the choice. The result ranks only those candidate brands and renders linked platform cards. This is modeled cross-domain brand affinity, not actual platform subscriber behavior, catalogue availability, territorial access, submission eligibility or distribution acceptance. Explain why each recommendation relates to the work and call out unsupported availability explicitly. Do not use location filters for digital brands.",
    inputSchema: z.object({ title: z.string().trim().min(1), platformIds: z.array(z.string().refine((id) => digitalPlatforms.some((platform) => platform.id === id), "Unknown catalogue platform.")).min(1), entityIds: z.array(z.uuid()).default([]), tagIds: z.array(z.string().startsWith("urn:tag:")).default([]) }).strict(),
    execute: async ({ title, platformIds, entityIds, tagIds }, { abortSignal }) => {
      if (!entityIds.length && !tagIds.length) throw new ApiError(400, "Resolve the work's comparable media or interests first.");
      const candidates = await Promise.all(digitalPlatforms.filter((platform) => platformIds.includes(platform.id)).map(async (platform) => {
        const matches = await qlooRequest("/search", { query: platform.name, types: "urn:entity:brand", take: "5" }, abortSignal);
        const match = matches.find((item) => item.name.toLocaleLowerCase() === platform.name.toLocaleLowerCase());
        return { platform, entity: match };
      }));
      const ids = [...new Set(candidates.flatMap((item) => item.entity ? [item.entity.entity_id] : []).map((id) => id.toLowerCase()))];
      if (!ids.length) throw new ApiError(404, "Qloo has no exact brand matches for the requested platforms.");
      const results = await qlooRequest("/v2/insights", {
        "filter.type": "urn:entity:brand", "filter.results.entities": ids.join(","),
        ...(entityIds.length ? { "signal.interests.entities": entityIds.join(",") } : {}),
        ...(tagIds.length ? { "signal.interests.tags": tagIds.join(",") } : {}), take: String(ids.length),
      }, abortSignal);
      if (!results.length) throw new ApiError(404, "Qloo has no platform-affinity results for these references.");
      const subjects = results.map((item) => {
        if (!ids.includes(item.entity_id.toLowerCase()) || (item.subtype !== "urn:entity:brand" && !item.types?.includes("urn:entity:brand"))) throw new ApiError(502, "Qloo returned an unexpected platform.");
        const affinity = z.object({ affinity: z.number().finite() }).safeParse(item.query);
        if (!affinity.success) throw new ApiError(502, "Qloo platform results are missing affinity values.");
        const candidate = candidates.find((value) => value.entity?.entity_id.toLowerCase() === item.entity_id.toLowerCase());
        const website = publicWebUrl.safeParse(candidate?.platform.website ?? item.properties?.website);
        const image = publicWebUrl.safeParse(item.properties?.image?.url);
        return { id: item.entity_id, name: item.name, ...(website.success ? { website: website.data } : {}), ...(image.success ? { image: image.data } : {}),
          tags: [], metrics: [{ key: "platformAffinity", label: "Cultural affinity", value: affinity.data.affinity, unit: "index" as const, source: "Qloo" }] };
      });
      const uncovered = candidates.filter((candidate) => !subjects.some((subject) => candidate.entity?.entity_id.toLowerCase() === subject.id.toLowerCase()));
      for (const { platform } of uncovered) subjects.push({ id: `catalogue:${platform.id}`, name: platform.name, website: platform.website, tags: [], metrics: [] });
      return remember(comparisonWidgetSchema.parse({ kind: "comparison", subjectLabel: "Platform", evidenceId: crypto.randomUUID(), title, source: "Qloo", retrievedAt: new Date().toISOString(), subjects, commonTags: [],
        basis: `${uncovered.length ? `No Qloo affinity coverage for: ${uncovered.map((item) => item.platform.name).join(", ")}. Their values remain absent. ` : ""}Relative cultural affinity between the supplied comparable works or taste tags and the returned platform brands. Compare values only within this query. These are not observed subscriber preferences, a probability of liking the original work, catalogue availability, territory availability, or permission to publish. Platform submissions and distribution requirements have not been verified.` }));
    },
  });
}
