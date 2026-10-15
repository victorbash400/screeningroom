import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountNotification } from "../lib/accountTypes";
import { object, parseNotifications } from "../lib/accountApi";
type Request = (path: string, init?: RequestInit) => Promise<unknown>;
export function useAccountNotifications(
  userId: string | undefined,
  request: Request,
) {
  const [owner, setOwner] = useState(userId);
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const load = useCallback(
    async (nextCursor?: string) => {
      const current = ++generation.current;
      if (!userId) {
        setItems([]);
        setError(null);
        setCursor(null);
        return;
      }
      setLoading(true);
      try {
        const response = object(
          await request(
            nextCursor
              ? `/api/notifications?${new URLSearchParams({ cursor: nextCursor })}`
              : "/api/notifications",
          ),
        );
        const next = parseNotifications(response);
        if (!(response.cursor === null || typeof response.cursor === "string"))
          throw new Error("Server returned an invalid notification cursor.");
        if (generation.current === current) {
          setItems((previous) =>
            nextCursor
              ? [
                  ...previous,
                  ...next.filter(
                    (item) =>
                      !previous.some((existing) => existing.id === item.id),
                  ),
                ]
              : next,
          );
          setOwner(userId);
          setCursor(response.cursor);
          setError(null);
        }
      } catch (failure) {
        if (generation.current === current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Cannot load notifications.",
          );
      } finally {
        if (generation.current === current) setLoading(false);
      }
    },
    [userId, request],
  );
  useEffect(() => {
    setItems([]);
    setOwner(userId);
    setCursor(null);
    void load();
    return () => {
      generation.current++;
    };
  }, [load, userId]);
  async function mutate(id: string, trashed?: boolean) {
    if (updating) return;
    setUpdating(true);
    const current = generation.current;
    try {
      const response = object(
        await request("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify(
            trashed === undefined ? { id } : { id, trashed },
          ),
        }),
      );
      const [notification] = parseNotifications({
        notifications: [response.notification],
      });
      if (current === generation.current) {
        setItems((previous) =>
          previous.map((item) => (item.id === id ? notification : item)),
        );
        setError(null);
      }
    } catch (failure) {
      if (current === generation.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Cannot update notification.",
        );
    } finally {
      setUpdating(false);
    }
  }
  const visible = owner === userId ? items : [];
  return {
    items: visible,
    loading,
    error: owner === userId ? error : null,
    load,
    updating,
    markRead: (id: string) => mutate(id),
    setTrashed: (id: string, trashed: boolean) => mutate(id, trashed),
    cursor: owner === userId ? cursor : null,
    unread: visible.filter((item) => !item.readAt && !item.trashedAt).length,
  };
}
