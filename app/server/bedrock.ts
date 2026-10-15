import "server-only";
import { getTokenProvider } from "@aws/bedrock-token-generator";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Agent, fetch as fetchWithDispatcher } from "undici";
import { env, region } from "./config";

const dispatcher = new Agent({ connect: { family: 4, timeout: 5_000 }, headersTimeout: 50_000, bodyTimeout: 50_000 });

export async function bedrockHeaders() {
  const token = await getTokenProvider({ region: region(), expiresInSeconds: 300 })();
  return { Authorization: `Bearer ${token}`, "OpenAI-Project": env("BEDROCK_PROJECT_ID") };
}

export async function chatModel() {
  const provider = createOpenAICompatible({ name: "screeningroom-bedrock", baseURL: env("BEDROCK_BASE_URL"), headers: await bedrockHeaders(), fetch: (url, options) => (fetchWithDispatcher as unknown as typeof fetch)(url, { ...options, dispatcher } as RequestInit & { dispatcher: Agent }) });
  return provider.chatModel(env("BEDROCK_MODEL_ID"));
}
