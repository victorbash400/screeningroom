import { z } from "zod";
import { publicWebUrl } from "./similarResults.ts";

export const entityImageSchema = z.object({ id: z.uuid(), image: publicWebUrl.nullable() }).strict();
export type EntityImageMetadata = z.infer<typeof entityImageSchema>;
const requests = new Map<string, Promise<EntityImageMetadata>>();

export function loadEntityImage(id: string, refresh = false, request: typeof fetch = fetch): Promise<EntityImageMetadata> {
  const key = z.uuid().parse(id).toLowerCase();
  const pending = requests.get(key);
  if (pending) return pending;
  const result = request(`/api/entities/image?id=${encodeURIComponent(key)}`, { credentials: "same-origin", cache: refresh ? "reload" : "default" }).then(async (response) => {
    const value = await response.json();
    if (!response.ok) throw new Error(typeof value?.error === "string" ? value.error : "Photo lookup failed. Retry.");
    const parsed = entityImageSchema.safeParse(value);
    if (!parsed.success) throw new Error("Photo lookup returned invalid data. Retry.");
    const metadata = parsed.data;
    if (metadata.id.toLowerCase() !== key) throw new Error("Photo lookup returned a different place or media item.");
    return metadata;
  }).finally(() => requests.delete(key));
  requests.set(key, result);
  return result;
}

export function canResolveEntityImage(id?: string) { return z.uuid().safeParse(id).success; }
