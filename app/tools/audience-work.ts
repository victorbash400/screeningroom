import { tool } from "ai";
import { z } from "zod";

export function audienceWorkTool(onReady: () => void) {
  return tool({
    description: "Establish the work before researching its audience. Record only facts supplied by the user, observed through selected-media tools, or already established in this conversation. Include its medium, subject and distinctive characteristics. If the work is unspecified or unclear, ask the user a concise question instead of calling this tool. A filename or generic request to find an audience is not enough. This is a request-scoped context check, not a new user form.",
    inputSchema: z.object({
      medium: z.string().trim().min(1),
      summary: z.string().trim().min(1),
      characteristics: z.array(z.string().trim().min(1)).min(1),
      basis: z.enum(["user description", "selected media", "conversation"]),
    }).strict(),
    execute: async (work) => { onReady(); return work; },
  });
}
