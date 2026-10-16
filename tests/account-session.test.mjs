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
test("transient revalidation failure preserves the verified account", async () => {
  let fail = false;
  const h = setup(() =>
    fail ? response({ error: "Unavailable" }, 503) : response(session()),
  );
  await h.render().load();
  fail = true;
  await h.render().load();
  assert.deepEqual(h.render().user, user);
  assert.equal(h.render().unavailable, true);
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
  h.channels[0].onmessage({ data: { type: "signed-in" } });
  assert.equal(h.render().ready, false);
  assert.equal(h.render().user, null);
  release(response({ user: null }));
  await flush();
  assert.equal(h.render().ready, true);
  assert.equal(h.render().user, null);
  cleanup();
});
test("returning to the window schedules no account checks or timers", async () => {
  const h = setup(() => response(session()));
  h.render();
  const cleanup = globalThis.sessionHarness.effects[0]();
  await flush();
  assert.deepEqual(h.render().user, user);
  assert.equal(h.listeners.has("focus"), false);
  assert.equal(h.timers.length, 0);
  assert.deepEqual(h.requests, ["/api/auth/session"]);
  cleanup();
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

test("initial session timeout is unavailable, not a confirmed sign-out", async () => {
  const h = setup(() => response({ error: "Timeout" }, 504));
  await h.render().load();
  assert.equal(h.render().user, null);
  assert.equal(h.render().unavailable, true);
  assert.equal(h.render().ready, true);
  assert.equal(h.render().error, "Timeout");
});
test("refresh timeout preserves the account and a later check recovers", async () => {
  let timeout = false;
  const h = setup((path) => path === "/api/auth/session" ? response(session()) : path === "/api/auth/refresh"
    ? (timeout ? response({ error: "Timeout" }, 504) : response(session()))
    : response({ error: "Expired" }, 401));
  await h.render().load();
  timeout = true;
  await assert.rejects(h.render().request("/api/records"), { message: "Timeout" });
  assert.deepEqual(h.render().user, user);
  assert.equal(h.render().unavailable, true);
  timeout = false;
  await h.render().load();
  assert.deepEqual(h.render().user, user);
  assert.equal(h.render().unavailable, false);
  assert.equal(h.render().error, null);
});
test("a failed protected retry does not sign out a successfully refreshed account", async () => {
  let attempts = 0;
  const h = setup((path) => path === "/api/auth/session" || path === "/api/auth/refresh"
    ? response(session()) : ++attempts === 1 ? response({ error: "Expired" }, 401) : response({ error: "Unavailable" }, 503));
  await h.render().load();
  await assert.rejects(h.render().request("/api/records"), { message: "Unavailable" });
  assert.deepEqual(h.render().user, user);
});
test("overlapping explicit checks share one session request", async () => {
  let release;
  const h = setup(() => new Promise((resolve) => { release = resolve; }));
  const first = h.render().load();
  const second = h.render().load();
  assert.equal(h.requests.length, 1);
  release(response(session()));
  await Promise.all([first, second]);
  assert.deepEqual(h.render().user, user);
});

test("concurrent expired requests share one refresh", async () => {
  let release;
  let refreshed = false;
  const h = setup((path) => {
    if (path === "/api/auth/session") return response(session());
    if (path === "/api/auth/refresh") return new Promise((resolve) => { release = () => { refreshed = true; resolve(response(session())); }; });
    return refreshed ? response({ ok: true }) : response({ error: "Expired" }, 401);
  });
  await h.render().load();
  const first = h.render().request("/api/records");
  const second = h.render().request("/api/notifications");
  await flush();
  assert.equal(h.requests.filter((path) => path === "/api/auth/refresh").length, 1);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(h.render().user, user);
});

test("a confirmed revoked session after refresh still closes access", async () => {
  const h = setup((path) => path === "/api/auth/session" || path === "/api/auth/refresh" ? response(session()) : response({ error: "Revoked" }, 401));
  await h.render().load();
  await assert.rejects(h.render().request("/api/records"), { message: "Revoked" });
  assert.equal(h.render().user, null);
  assert.equal(h.render().unavailable, false);
});

test("profile events sync without clearing the workspace or fetching AWS", async () => {
  const h = setup(() => response(session()));
  h.render();
  const cleanup = globalThis.sessionHarness.effects[0]();
  await flush();
  const before = h.requests.length;
  h.channels[0].onmessage({ data: { type: "profile-updated", user: { ...user, name: "Updated" } } });
  assert.equal(h.render().user.name, "Updated");
  assert.equal(h.render().ready, true);
  assert.equal(h.requests.length, before);
  h.channels[0].onmessage({ data: { type: "profile-updated", user: { ...user, id: "other", name: "Other" } } });
  assert.equal(h.render().user.id, user.id);
  assert.equal(h.render().user.name, "Updated");
  cleanup();
});
test("sign-out events sync immediately without a redundant session request", async () => {
  const h = setup(() => response(session()));
  h.render();
  const cleanup = globalThis.sessionHarness.effects[0]();
  await flush();
  const before = h.requests.length;
  h.channels[0].onmessage({ data: { type: "signed-out" } });
  assert.equal(h.render().user, null);
  assert.equal(h.render().ready, true);
  assert.equal(h.requests.length, before);
  cleanup();
});
test("streaming chat requests use the same refresh flow", async () => {
  let sent = 0;
  const h = setup((path) => path === "/api/auth/session" || path === "/api/auth/refresh" ? response(session()) : ++sent === 1 ? response({ error: "Expired" }, 401) : new Response("streamed reply", { headers: { "Content-Type": "text/event-stream" } }));
  await h.render().load();
  const result = await h.render().fetch("/api/chat", { method: "POST", body: "{}" });
  assert.equal(await result.text(), "streamed reply");
  assert.deepEqual(h.requests, ["/api/auth/session", "/api/chat", "/api/auth/refresh", "/api/chat"]);
  assert.deepEqual(h.render().user, user);
});
