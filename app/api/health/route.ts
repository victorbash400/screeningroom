import { requireUser } from "../../server/auth";
import { connectionStatus } from "../../server/connections";
import { connectionServices } from "../../lib/connections";
import type { ConnectionId, ConnectionStatus } from "../../lib/connections";
import { ApiError, failure, json } from "../../server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const service = new URL(request.url).searchParams.get("service");
    if (service && !connectionServices.some((item) => item.id === service)) throw new ApiError(400, "Unknown connection.");
    const checks = service ? connectionServices.filter((item) => item.id === service) : connectionServices;
    const services: Partial<Record<ConnectionId, ConnectionStatus>> = {};
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]);
    await Promise.all(checks.map(async ({ id }) => {
      try { services[id] = await connectionStatus(id, user.sub, Boolean(service), signal); }
      catch (error) {
        services[id] = "unavailable";
        console.error("Connection check failed", { service: id, name: error instanceof Error ? error.name : "UnknownError" });
      }
    }));
    const ok = !Object.values(services).includes("unavailable");
    return json({ status: ok ? "ok" : "degraded", services }, ok ? 200 : 503);
  } catch (error) { return failure(error); }
}
