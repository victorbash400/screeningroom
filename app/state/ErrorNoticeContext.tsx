"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import ErrorPopup from "../components/shell/ErrorPopup";

interface Notice {
  id: string;
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}
const ErrorNoticeContext = createContext<{
  enqueue: (notice: Notice) => void;
  remove: (id: string) => void;
} | null>(null);

export function ErrorNoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const enqueue = useCallback((notice: Notice) => {
    setNotices((pending) => [...pending.filter((item) => item.id !== notice.id), notice]);
  }, []);
  const remove = useCallback((id: string) => {
    setNotices((pending) => pending.filter((item) => item.id !== id));
  }, []);
  const current = notices[0];
  const matching = current ? notices.filter((item) => item.message === current.message) : [];
  const retry = matching.find((item) => item.onRetry)?.onRetry;
  function finish(retryRequested: boolean) {
    if (!current) return;
    const dismiss = () => {
      setNotices((pending) => pending.filter((item) => item.message !== current.message));
      matching.forEach((item) => item.onDismiss());
    };
    if (retryRequested) {
      flushSync(dismiss);
      retry?.();
    } else dismiss();
  }
  return (
    <ErrorNoticeContext value={{ enqueue, remove }}>
      {children}
      {current && (
        <ErrorPopup
          key={current.id}
          message={current.message}
          onDismiss={() => finish(false)}
          onRetry={retry ? () => finish(true) : undefined}
        />
      )}
    </ErrorNoticeContext>
  );
}

export function useErrorNotices() {
  const context = useContext(ErrorNoticeContext);
  if (!context) throw new Error("Error notice provider is missing.");
  return context;
}
