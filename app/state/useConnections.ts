import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/accountApi";
import { connectionServices, parseConnectionHealth } from "../lib/connections";
import type { ConnectionId, ConnectionState } from "../lib/connections";
import { useAccount } from "./AccountContext";

function initialStates() {
  return Object.fromEntries(connectionServices.map(({ id }) => [id, { busy: true }])) as Record<ConnectionId, ConnectionState>;
}
export function useConnections() {
  const { request, user } = useAccount();
  const [states, setStates] = useState(initialStates);
  const [error, setError] = useState<string | null>(null);
  const requests = useRef(new Map<string, AbortController>());
  const check = useCallback(async (service?: ConnectionId) => {
    const key = service ?? "all";
    if (requests.current.has(key)) return;
    setError(null);
    const controller = new AbortController();
    requests.current.set(key, controller);
    const ids = service ? [service] : connectionServices.map(({ id }) => id);
    setStates((previous) => {
      const next = { ...previous };
      for (const id of ids) next[id] = { ...previous[id], busy: true, error: undefined };
      return next;
    });
    try {
      let value: unknown;
      try { value = await request(`/api/health${service ? `?service=${service}` : ""}`, { signal: controller.signal }); }
      catch (error) { if (error instanceof ApiError && error.status === 503 && error.data) value = error.data; else throw error; }
      const result = parseConnectionHealth(value, service);
      if (controller.signal.aborted) return;
      if (service && result[service] === "unavailable") setError(`${connectionServices.find((item) => item.id === service)!.label} is unavailable. Check its server configuration and try again.`);
      setStates((previous) => {
        const next = { ...previous };
        for (const id of ids) next[id] = { status: result[id], busy: false, error: result[id] === "unavailable" ? `${connectionServices.find((item) => item.id === id)!.label} is unavailable. Check its server configuration and try again.` : undefined };
        return next;
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : "Cannot check connection.");
      setStates((previous) => {
        const next = { ...previous };
        for (const id of ids) next[id] = { status: previous[id].status, busy: false, error: error instanceof Error ? error.message : "Cannot check connection." };
        return next;
      });
    } finally { if (requests.current.get(key) === controller) requests.current.delete(key); }
  }, [request]);
  useEffect(() => {
    setStates(initialStates());
    if (user) void check();
    const active = requests.current;
    return () => { for (const controller of active.values()) controller.abort(); active.clear(); };
  }, [user?.id, check]);
  return { states, check, error, clearError: () => setError(null) };
}
