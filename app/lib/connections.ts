import { object } from "./accountApi.ts";

export const connectionServices = [
  { id: "auth", label: "Authentication" },
  { id: "database", label: "Database" },
  { id: "storage", label: "Storage" },
  { id: "bedrock", label: "Bedrock" },
  { id: "qloo", label: "Qloo API" },
] as const;
export type ConnectionId = typeof connectionServices[number]["id"];
export type ConnectionStatus = "connected" | "configured" | "unavailable";
export interface ConnectionState { status?: ConnectionStatus; busy: boolean; error?: string }

export function parseConnectionHealth(value: unknown, service?: ConnectionId) {
  const data = object(value), services = object(data.services);
  if (data.status !== "ok" && data.status !== "degraded") throw new Error("Server returned invalid connection status.");
  const result: Partial<Record<ConnectionId, ConnectionStatus>> = {};
  for (const { id } of connectionServices) {
    if (service && service !== id) continue;
    const status = services[id];
    if (status !== "connected" && status !== "configured" && status !== "unavailable") throw new Error("Server returned invalid connection status.");
    result[id] = status;
  }
  return result;
}
