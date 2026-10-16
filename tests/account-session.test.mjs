import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { sessionExpiry } from "../app/lib/sessionExpiry.ts";

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/useAccountSession.ts")) {
      if (specifier === "react")
        return {
          url: `data:text/javascript,${encodeURIComponent("export const useState=(value)=>globalThis.sessionHarness.state(value); export const useRef=(value)=>globalThis.sessionHarness.ref(value); export const useEffect=(effect)=>globalThis.sessionHarness.effects.push(effect); export const useCallback=(callback)=>callback;")}`,
          shortCircuit: true,
        };
      if (specifier.startsWith("../lib/"))
        return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { useAccountSession } = await import("../app/state/useAccountSession.ts");
const user = {
  id: "account-a",
  email: "account@example.test",
  name: "Account",
  emailVerified: true,
};
const session = () => ({ user, expiresAt: Date.now() + 3_600_000 });
function setup(respond) {
  const values = [],
    requests = [],
    timers = [],
    channels = [],
    listeners = new Map();
  let cursor = 0;
  globalThis.sessionHarness = {
    effects: [],
    state(value) {
      const index = cursor++;
      if (!(index in values)) values[index] = value;
      return [
        values[index],
        (next) => {
          values[index] =
            typeof next === "function" ? next(values[index]) : next;
        },
      ];
    },
    ref(value) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: value };
      return values[index];
    },
  };
  globalThis.fetch = async (path, init) => {
    requests.push(path);
    return respond(path, init);
  };
  globalThis.window = {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
    setTimeout: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {},
  };
  globalThis.document = {
    visibilityState: "visible",
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.BroadcastChannel = class {
    constructor() {
      channels.push(this);
    }
    postMessage() {}
    close() {}
  };
  function render() {
    cursor = 0;
    globalThis.sessionHarness.effects = [];
    return useAccountSession();
  }
  return { render, requests, timers, channels, listeners };
}
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("only a valid server session restores the account", async () => {
  const h = setup(() => response(session()));
  assert.equal(h.render().ready, false);
  await h.render().load();
  assert.deepEqual(h.render().user, user);
  assert.equal(h.render().ready, true);
});
test("failed revalidation removes the previous account", async () => {
  let fail = false;
  const h = setup(() =>
    fail ? response({ error: "Unavailable" }, 503) : response(session()),
  );
  await h.render().load();
  fail = true;
  await h.render().load();
  assert.equal(h.render().user, null);
  assert.equal(h.render().error, "Unavailable");
});
test("a stale session response cannot reopen the app after sign-out", async () => {
  let release;
  const h = setup((path) =>
    path === "/api/auth/session"
      ? new Promise((resolve) => {
          release = resolve;
        })
      : response({ ok: true }),
  );
  const pending = h.render().load();
  assert.equal(await h.render().signOut(), true);
  release(response(session()));
  await pending;
  assert.equal(h.render().user, null);
  assert.equal(h.render().ready, true);
});
test("a cross-tab account change closes access before revalidation completes", async () => {
  let release,
    deferred = false;
  const h = setup(() =>
    deferred
      ? new Promise((resolve) => {
          release = resolve;
        })
      : response(session()),
  );
  h.render();
  const cleanup = globalThis.sessionHarness.effects[0]();
  await flush();
  assert.deepEqual(h.render().user, user);
  deferred = true;
  h.channels[0].onmessage({ data: "changed" });
  assert.equal(h.render().ready, false);
  assert.equal(h.render().user, null);
  release(response({ user: null }));
  await flush();
  assert.equal(h.render().ready, true);
  assert.equal(h.render().user, null);
  cleanup();
});
test("session expiry closes access locally without polling", async () => {
  const h = setup(() => response(session()));
  await h.render().load();
  h.render();
  globalThis.sessionHarness.effects[1]();
  assert.equal(h.timers.length, 1);
  assert.ok(h.timers[0].delay > 0);
  const requests = h.requests.length;
  h.timers[0].callback();
  assert.equal(h.render().user, null);
  assert.equal(h.render().error, "Session expired. Sign in again.");
  assert.equal(h.requests.length, requests);
});
test("failed refresh closes access and does not retry protected requests indefinitely", async () => {
  const h = setup((path) =>
    path === "/api/auth/session"
      ? response(session())
      : response({ error: "Sign in to continue." }, 401),
  );
  await h.render().load();
  await assert.rejects(h.render().request("/api/records"));
  assert.equal(h.render().user, null);
  assert.deepEqual(h.requests, [
    "/api/auth/session",
    "/api/records",
    "/api/auth/refresh",
  ]);
});
test("expired or missing server expiry cannot establish a session", () => {
  for (const value of [
    undefined,
    null,
    "tomorrow",
    NaN,
    Infinity,
    Date.now() - 1,
  ])
    assert.throws(() => sessionExpiry(value));
  const value = Date.now() + 60_000;
  assert.equal(sessionExpiry(value), value);
});
