import assert from "node:assert/strict";
import test from "node:test";
import { appearanceVariables, defaultAppearance, parseAppearance, parseColor } from "../app/lib/appearance.ts";

test("Clay surfaces use Garden's exact mixing relationships", () => {
  const colors = appearanceVariables(defaultAppearance.light);
  assert.equal(colors["--panel"], "#f5f5f3");
  assert.equal(colors["--stripe"], "#f4f4f2");
  assert.equal(colors["--border"], "#dcdcda");
  assert.equal(colors["--selection"], "#f1e4dd");
  assert.equal(colors["--ui-font"], "Geist, sans-serif");
});
test("paired profiles survive serialization without losing the selected mode", () => {
  const value = { ...defaultAppearance, mode: "system" };
  assert.deepEqual(parseAppearance(JSON.stringify(value)), value);
});
test("invalid custom colors and unsupported persisted values fail explicitly", () => {
  for (const value of ["white", "#fff", "#ZZZZZZ", "1234567"]) assert.throws(() => parseColor(value));
  assert.equal(parseColor(" #abcdef "), "#ABCDEF");
  assert.throws(() => parseAppearance(JSON.stringify({ ...defaultAppearance, light: { ...defaultAppearance.light, contrast: 101 } })));
  assert.throws(() => parseAppearance(JSON.stringify({ ...defaultAppearance, dark: { ...defaultAppearance.dark, font: "Unknown" } })));
});
