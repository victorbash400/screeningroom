import test from "node:test";
import assert from "node:assert/strict";
import {
  affinityCardCount,
  affinityLayout,
  affinityPosition,
} from "../app/lib/affinityLayout.ts";

test("desktop half-wheels leave the central sign-in area clear throughout a full turn", () => {
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [1024, 768],
  ]) {
    const layout = affinityLayout(width, height);
    for (let step = 0; step < 360; step++) {
      const phase = (step / 360) * Math.PI * 2;
      for (let index = 0; index < affinityCardCount; index++) {
        const left = affinityPosition(layout, index, false, phase);
        const right = affinityPosition(layout, index, true, phase);
        assert.ok(left.x + layout.cardWidth * 0.8 < width / 2 - 130);
        assert.ok(right.x - layout.cardWidth * 0.8 > width / 2 + 130);
      }
    }
  }
});
test("portrait layout keeps artwork above and below the welcome controls", () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [600, 900],
  ]) {
    const layout = affinityLayout(width, height);
    for (let step = 0; step < 360; step++) {
      for (let index = 0; index < affinityCardCount; index++) {
        const phase = (step / 360) * Math.PI * 2;
        assert.ok(
          affinityPosition(layout, index, false, phase).y +
            layout.cardWidth * 0.8 <
            height / 2 - 130,
        );
        assert.ok(
          affinityPosition(layout, index, true, phase).y -
            layout.cardWidth * 0.8 >
            height / 2 + 130,
        );
      }
    }
  }
});
