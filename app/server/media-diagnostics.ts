import "server-only";
import { randomUUID } from "node:crypto";

type Details = { cache?: "hit" | "miss"; model?: string; duration?: number; audioTracks?: number; videoTracks?: number; frames?: { index: number; time: number; bytes: number }[]; indices?: number[]; count?: number; bytes?: number; start?: number; end?: number; error?: string };
export type MediaLog = (stage: string, details?: Details) => void;
export async function diagnoseMedia<T>(operation: string, fileId: string, run: (log: MediaLog) => Promise<T>) {
  const requestId = randomUUID(), started = performance.now();
  const log: MediaLog = (stage, details = {}) => console.info("Media analysis", JSON.stringify({ requestId, fileId, operation, stage, elapsedMs: Math.round(performance.now() - started), ...details }));
  log("start");
  try { const result = await run(log); log("complete"); return result; }
  catch (error) { log("failed", { error: error instanceof Error ? error.name : "UnknownError" }); throw error; }
}
