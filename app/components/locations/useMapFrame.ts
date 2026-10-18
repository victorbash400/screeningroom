import { useEffect, useState, type PointerEvent, type RefObject } from "react";

interface Frame { x: number; y: number; width: number; height: number }
function fit(frame: Frame): Frame {
  const top = window.innerWidth < 800 ? 112 : 8;
  const width = Math.min(Math.max(300, frame.width), window.innerWidth - 16);
  const height = Math.min(Math.max(280, frame.height), window.innerHeight - top - 8);
  return { width, height,
    x: Math.max(8, Math.min(frame.x, window.innerWidth - width - 8)),
    y: Math.max(top, Math.min(frame.y, window.innerHeight - height - 8)),
  };
}

export function useMapFrame(anchor: RefObject<HTMLElement | null>) {
  const [frame, setFrame] = useState<Frame>();
  useEffect(() => {
    const rect = anchor.current?.getBoundingClientRect();
    const width = Math.min(520, Math.max(340, (rect?.left ?? 540) - 300));
    setFrame(fit({ x: (rect?.left ?? 540) - width - 12, y: rect?.top ?? 12, width, height: rect?.height ?? window.innerHeight - 80 }));
    const onResize = () => {
      const current = anchor.current?.getBoundingClientRect();
      setFrame((value) => value && fit({ ...value, y: current?.top ?? value.y, height: current?.height ?? value.height }));
    };
    const observer = new ResizeObserver(onResize);
    if (anchor.current) observer.observe(anchor.current);
    window.addEventListener("resize", onResize);
    return () => { observer.disconnect(); window.removeEventListener("resize", onResize); };
  }, [anchor]);

  function start(event: PointerEvent<HTMLElement>, mode: "move" | "resize") {
    if (!frame || event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const origin = { ...frame, pointerX: event.clientX, pointerY: event.clientY };
    const move = (next: globalThis.PointerEvent) => {
      const dx = next.clientX - origin.pointerX, dy = next.clientY - origin.pointerY;
      setFrame(fit(mode === "move" ? { ...origin, x: origin.x + dx, y: origin.y + dy }
        : { ...origin, width: Math.min(origin.width + dx, window.innerWidth - origin.x - 8), height: Math.min(origin.height + dy, window.innerHeight - origin.y - 8) }));
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  }

  function adjust(key: string, mode: "move" | "resize") {
    const delta = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[key];
    if (!delta) return false;
    setFrame((value) => value && fit(mode === "move" ? { ...value, x: value.x + delta[0], y: value.y + delta[1] }
      : { ...value, width: value.width + delta[0], height: value.height + delta[1] }));
    return true;
  }
  return { frame, start, adjust };
}
