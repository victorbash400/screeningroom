import "server-only";
import { Agent, fetch as fetchWithDispatcher } from "undici";

const dispatcher = new Agent({ connect: { family: 4, timeout: 10_000 } });
export const qlooFetch: typeof fetch = (url, options) => (fetchWithDispatcher as unknown as typeof fetch)(url, { ...options, dispatcher } as RequestInit & { dispatcher: Agent });
