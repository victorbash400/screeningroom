import { useEffect, useRef, type RefObject } from "react";
import {
  affinityCardCount,
  affinityLayout,
  affinityPosition,
} from "../lib/affinityLayout";
import {
  affinityConnections,
  affinityConnectionPaths,
  affinityConnectionVisibility,
  affinityBranchVisibility,
  type AffinityConnection,
} from "../lib/affinityConnections";

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
    const layers = [
      ...svg.querySelectorAll<SVGGElement>("[data-connection-layer]"),
    ].map((layer) => ({
      element: layer,
      connections: [
        ...layer.querySelectorAll<SVGGElement>("[data-connection]"),
      ].map((element) => ({
        element,
        trunk: element.querySelector<SVGPathElement>("[data-trunk]")!,
        branches: [
          ...element.querySelectorAll<SVGPathElement>("[data-branch]"),
        ],
        junction: element.querySelector<SVGCircleElement>("[data-junction]")!,
      })),
    }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const layout = affinityLayout(size.width, size.height);
    let animation = 0,
      previous = 0,
      cycle = -1;
    let connections: AffinityConnection[] = [],
      oldConnections: AffinityConnection[] = [];
    function draw(time: number) {
      if (previous && !reduced.matches)
        elapsedTime.current += Math.min(time - previous, 64);
      previous = time;
      const elapsed = elapsedTime.current;
      const phase = reduced.matches ? 0 : (elapsed / 90000) * Math.PI * 2;
      const points = cards.map((card, index) => {
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
        return point;
      });
      const cycleDuration = 90000 / affinityCardCount;
      const nextCycle = Math.floor(elapsed / cycleDuration);
      if (cycle !== nextCycle) {
        oldConnections = connections;
        connections = affinityConnections(points, layout, nextCycle);
        cycle = nextCycle;
      }
      const blend = reduced.matches
        ? 1
        : Math.min(1, (elapsed % cycleDuration) / 1000);
      const eased = blend * blend * (3 - 2 * blend);
      layers.forEach((layer, index) => {
        const topology = index === 0 ? oldConnections : connections;
        layer.element.setAttribute(
          "opacity",
          String((index === 0 ? 1 - eased : eased) * 0.68),
        );
        layer.connections.forEach((nodes, lane) => {
          const connection = topology[lane];
          nodes.element.setAttribute(
            "opacity",
            connection
              ? String(affinityConnectionVisibility(connection, points, layout))
              : "0",
          );
          if (!connection) return;
          const paths = affinityConnectionPaths(
            connection,
            points,
            layout,
            lane,
          );
          nodes.trunk.setAttribute("d", paths.trunk);
          nodes.branches.forEach((branch, branchIndex) => {
            branch.setAttribute("d", paths.branches[branchIndex]);
            branch.setAttribute(
              "opacity",
              String(
                affinityBranchVisibility(
                  connection,
                  branchIndex,
                  points,
                  layout,
                ),
              ),
            );
          });
          nodes.junction.setAttribute("cx", String(paths.junction.x));
          nodes.junction.setAttribute("cy", String(paths.junction.y));
        });
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
