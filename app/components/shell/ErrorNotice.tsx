import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useErrorNotices } from "../../state/ErrorNoticeContext";
export default function ErrorNotice({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const id = useId();
  const { enqueue, remove } = useErrorNotices();
  const callbacks = useRef({ onRetry, onDismiss });
  useLayoutEffect(() => {
    callbacks.current = { onRetry, onDismiss };
  });
  const canRetry = Boolean(onRetry);
  useEffect(() => {
    enqueue({
      id,
      message,
      onDismiss: () => callbacks.current.onDismiss?.(),
      onRetry: canRetry ? () => callbacks.current.onRetry?.() : undefined,
    });
    return () => remove(id);
  }, [id, message, canRetry, enqueue, remove]);
  return null;
}
