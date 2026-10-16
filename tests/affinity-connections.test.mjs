import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import {
  affinityCardCount,
  affinityLayout,
  affinityPosition,
} from "../app/lib/affinityLayout.ts";
registerHooks({
  resolve(specifier, context, next) {
    return next(
      context.parentURL?.endsWith("/affinityConnections.ts") &&
        specifier === "./affinityLayout"
        ? "./affinityLayout.ts"
        : specifier,
      context,
    );
  },
});
const {
  affinityConnections,
  affinityConnectionPaths,
  affinityConnectionVisibility,
  affinityBranchVisibility,
} = await import("../app/lib/affinityConnections.ts");
function pointsFor(layout, phase = 0) {
  return [false, true].flatMap((right) =>
    Array.from({ length: affinityCardCount }, (_, index) =>
      affinityPosition(layout, index, right, phase),
    ),
  );
}

test("several people each branch to two distinct media tiles", () => {
  const layout = affinityLayout(1280, 720),
    points = pointsFor(layout);
  const graph = affinityConnections(points, layout, 0);
  assert.equal(graph.length, 2);
  assert.equal(new Set(graph.map((edge) => edge.source)).size, 2);
  for (const edge of graph) {
    assert.ok(edge.source < affinityCardCount);
    assert.equal(new Set(edge.targets).size, 2);
    assert.ok(edge.targets.every((target) => target >= affinityCardCount));
  }
});
test("wheel steps change the pairings while remaining deterministic", () => {
  const layout = affinityLayout(1280, 720),
    points = pointsFor(layout);
  assert.notDeepEqual(
    affinityConnections(points, layout, 0),
    affinityConnections(
      pointsFor(layout, (Math.PI * 2) / affinityCardCount),
      layout,
      1,
    ),
  );
  assert.deepEqual(
    affinityConnections(points, layout, 1),
    affinityConnections(points, layout, 1),
  );
});
test("branching connections remain valid around a full wheel rotation on desktop and mobile", () => {
  for (const [width, height] of [
    [1280, 720],
    [1920, 1080],
    [390, 844],
    [320, 568],
  ]) {
    const layout = affinityLayout(width, height);
    for (let step = 0; step < 360; step++) {
      const points = pointsFor(layout, (step * Math.PI) / 180);
      const graph = affinityConnections(points, layout, Math.floor(step / 20));
      assert.ok(graph.length >= 2);
      for (const [lane, edge] of graph.entries()) {
        const paths = affinityConnectionPaths(edge, points, layout, lane);
        assert.equal(paths.branches.length, 2);
        assert.ok(
          Number.isFinite(paths.junction.x) &&
            Number.isFinite(paths.junction.y),
        );
        if (layout.compact)
          assert.ok(paths.junction.x <= 12 || paths.junction.x >= width - 12);
        else assert.ok(paths.junction.x < width / 2 - 150);
        assert.ok(affinityConnectionVisibility(edge, points, layout) >= 0);
        assert.ok(affinityConnectionVisibility(edge, points, layout) <= 1);
      }
    }
  }
});

test("one departing endpoint does not hide the other branch", () => {
  const layout = affinityLayout(1280, 720),
    points = pointsFor(layout);
  const connection = affinityConnections(points, layout, 0)[0];
  points[connection.targets[1]] = {
    ...points[connection.targets[1]],
    y: layout.height / 2,
  };
  assert.equal(affinityBranchVisibility(connection, 1, points, layout), 0);
  assert.ok(affinityBranchVisibility(connection, 0, points, layout) > 0.5);
  assert.ok(affinityConnectionVisibility(connection, points, layout) > 0.5);
});
