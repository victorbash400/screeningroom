import "server-only";

export async function authOperation<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try { return await operation(); }
  catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("Authentication operation failed", JSON.stringify({ stage, name, ...(name === "TimeoutError" && error instanceof Error ? { detail: error.message } : {}), elapsedMs: Math.round(performance.now() - started) }));
    throw error;
  }
}
