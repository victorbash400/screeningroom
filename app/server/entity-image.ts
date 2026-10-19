import "server-only";
import { z } from "zod";
import { qlooJson } from "../tools/qloo";
import { entityImageSchema } from "../lib/entityImage";
import { publicWebUrl } from "../lib/similarResults";
import { ApiError } from "./http";

const responseSchema = z.object({ results: z.array(z.object({ entity_id: z.uuid(), properties: z.object({ image: z.object({ url: z.string().nullish() }).nullish() }).nullish() })) });
export async function entityImage(id: string, signal?: AbortSignal) {
  const key = z.uuid().parse(id);
  const response = responseSchema.safeParse(await qlooJson("/entities", { entity_ids: key }, signal));
  if (!response.success) throw new ApiError(502, "Qloo returned invalid photo metadata. Retry.");
  const entity = response.data.results.find((item) => item.entity_id.toLowerCase() === key.toLowerCase());
  if (!entity) throw new ApiError(404, "This place or media item is no longer available in Qloo.");
  const url = entity.properties?.image?.url;
  if (url && !publicWebUrl.safeParse(url).success) throw new ApiError(502, "Qloo returned an invalid photo URL.");
  return entityImageSchema.parse({ id: key, image: url || null });
}
