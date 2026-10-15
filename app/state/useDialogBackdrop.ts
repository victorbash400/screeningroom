import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

function outside(
  event: MouseEvent<HTMLDialogElement> | PointerEvent<HTMLDialogElement>,
) {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  );
}

export function useDialogBackdrop(onClose: () => void) {
  const startedOutside = useRef(false);
  return {
    onPointerDown(event: PointerEvent<HTMLDialogElement>) {
      startedOutside.current = event.button === 0 && outside(event);
    },
    onClick(event: MouseEvent<HTMLDialogElement>) {
      const dismiss = startedOutside.current && outside(event);
      startedOutside.current = false;
      if (dismiss) onClose();
    },
  };
}
