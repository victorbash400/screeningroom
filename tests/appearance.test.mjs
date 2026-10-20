import assert from "node:assert/strict";
import test from "node:test";
import { appearanceVariables, contrastRatio, darkProfiles, defaultAppearance, lightProfiles, parseAppearance, parseColor } from "../app/lib/appearance.ts";

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

test("every preset keeps text readable on resting, hovered, and selected surfaces", () => {
  for (const profile of [...lightProfiles, ...darkProfiles]) {
    const colors = appearanceVariables(profile);
    for (const key of ["--surface", "--panel", "--hover", "--selection"]) {
      for (const foreground of ["--ink", "--muted"]) {
        assert.ok(contrastRatio(colors[foreground], colors[key]) >= 4.5, `${profile.name}: ${foreground} on ${key}`);
      }
    }
    assert.ok(contrastRatio(colors["--on-accent"], profile.accent) >= 4.5, `${profile.name}: accent button text`);
    assert.ok(contrastRatio(colors["--danger"], profile.surface) >= 4.5, `${profile.name}: error text`);
  }
});

test("all presets have unique identities and survive account appearance serialization", () => {
  for (const [mode, profiles] of [["light", lightProfiles], ["dark", darkProfiles]]) {
    assert.equal(new Set(profiles.map((profile) => profile.id)).size, profiles.length);
    assert.equal(new Set(profiles.map((profile) => profile.name)).size, profiles.length);
    for (const profile of profiles) {
      const value = { ...defaultAppearance, mode, [mode]: profile };
      assert.deepEqual(parseAppearance(JSON.stringify(value)), value);
    }
  }
});
