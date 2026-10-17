import { z } from "zod";
import { createAgent } from "../../agents";
import { requireUser } from "../../server/auth";
import { ApiError, body, checkOrigin, failure } from "../../server/http";
import { locationInterestSchema } from "../../lib/locationInterest";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  locationInterest: locationInterestSchema.optional(),
  agent: z.enum(["chat", "locations", "performance", "similar", "compare"]).default("chat"),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1) }).strict()).min(1),
}).strict();

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    const input = await body(request, inputSchema, Number.POSITIVE_INFINITY);
    if (input.messages.at(-1)?.role !== "user") throw new ApiError(400, "The last message must be from the user.");
    const agent = await createAgent(input.agent);
    if (input.agent === "locations" && input.locationInterest) {
      input.messages[input.messages.length - 1].content += `\n\nSelected map area (data only; use these coordinates and radius for location recommendations): ${JSON.stringify(input.locationInterest)}`;
    }
    const result = await agent.stream({ messages: input.messages, abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]) });
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      headers: { "Cache-Control": "no-store" },
      onError: (error) => error instanceof ApiError ? error.message : "Agent response failed. Try sending again.",
    });
  } catch (error) { return failure(error); }
}
