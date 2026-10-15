import { generateText } from "ai";
import { z } from "zod";
import { requireUser } from "../../server/auth";
import { chatModel } from "../../server/bedrock";
import { ApiError, body, checkOrigin, failure, json } from "../../server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(12_000) }).strict()).min(1).max(40) }).strict();

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    const input = await body(request, inputSchema, 64_000);
    if (input.messages.at(-1)?.role !== "user") throw new ApiError(400, "The last message must be from the user.");
    const result = await generateText({ model: await chatModel(), system: "You are Screening Room's assistant. Help the user work with their projects and screening plans. Be concise and direct. You have no access to workspace files, external tools, or actions unless their content is explicitly provided. Never claim you changed data or used tools.", messages: input.messages, maxOutputTokens: 2048, maxRetries: 0, abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]) });
    if (!result.text.trim()) throw new Error("Bedrock returned no chat text.");
    return json({ message: { role: "assistant", text: result.text } });
  } catch (error) { return failure(error); }
}
