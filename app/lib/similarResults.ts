import { z } from "zod";

export const publicWebUrl = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "Use a public web URL.");

export const similarResultSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
  image: publicWebUrl.optional(), website: publicWebUrl.optional(),
  year: z.number().optional(), description: z.string().optional(),
});
export const similarResultsSchema = z.array(similarResultSchema);
export type SimilarResult = z.infer<typeof similarResultSchema>;
