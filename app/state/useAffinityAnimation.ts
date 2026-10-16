import { useEffect, useRef, type RefObject } from "react";
import {
  affinityCardCount,
  affinityLayout,
  affinityPosition,
} from "../lib/affinityLayout";

export function useAffinityAnimation(
  frame: RefObject<SVGSVGElement | null>,
  size: { width: number; height: number },
  dismissed: boolean,
) {
  const elapsedTime = useRef(0);
  useEffect(() => {
    const svg = frame.current;
    if (!svg) return;
    const cards = [...svg.querySelectorAll<SVGGElement>("[data-card]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const layout = affinityLayout(size.width, size.height);
    let animation = 0,
      previous = 0;
    function draw(time: number) {
      if (previous && !reduced.matches)
        elapsedTime.current += Math.min(time - previous, 64);
      previous = time;
      const elapsed = elapsedTime.current;
      const phase = reduced.matches ? 0 : (elapsed / 90000) * Math.PI * 2;
      cards.forEach((card, index) => {
        const point = affinityPosition(
          layout,
          index % affinityCardCount,
          index >= affinityCardCount,
          phase,
        );
        card.setAttribute(
          "transform",
          `translate(${point.x} ${point.y}) rotate(${point.rotation})`,
        );
      });
      svg?.setAttribute("data-ready", "true");
      if (!dismissed && !reduced.matches && !document.hidden)
        animation = requestAnimationFrame(draw);
    }
    const resume = () => {
      cancelAnimationFrame(animation);
      previous = 0;
      if (!document.hidden) animation = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      document.removeEventListener("visibilitychange", resume);
      reduced.removeEventListener("change", resume);
    };
  }, [frame, size, dismissed]);
}
