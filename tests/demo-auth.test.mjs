import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const calls = [];
globalThis.demoAuthCalls = calls;
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/api/auth/demo/route.ts")) {
      if (specifier.endsWith("/password-sign-in"))
        return {
          url: `data:text/javascript,${encodeURIComponent('export async function passwordSignIn(email,password){globalThis.demoAuthCalls.push({email,password});return new Response(JSON.stringify({authenticated:true}),{headers:{"Content-Type":"application/json"}})}')}`,
          shortCircuit: true,
        };
      if (specifier.startsWith("../../../server/"))
        return next(`${specifier}.ts`, context);
    }
    return next(
      specifier === "next/server" ? "next/server.js" : specifier,
      context,
    );
  },
});
const { POST } = await import("../app/api/auth/demo/route.ts");
const request = (origin, body = {}) =>
  new Request("http://localhost:3000/api/auth/demo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });

test("demo rejects missing and cross-site origins before authentication", async () => {
  for (const origin of [undefined, "https://untrusted.example"])
    assert.equal((await POST(request(origin))).status, 403);
  assert.equal(calls.length, 0);
});
test("demo fails explicitly when server credentials are unavailable", async () => {
  delete process.env.DEMO_ACCOUNT_EMAIL;
  delete process.env.DEMO_ACCOUNT_PASSWORD;
  const response = await POST(request("http://localhost:3000"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Demo account is not configured.",
  });
  assert.equal(calls.length, 0);
});
test("demo accepts only an empty request and uses server credentials", async () => {
  process.env.DEMO_ACCOUNT_EMAIL = "demo@example.test";
  process.env.DEMO_ACCOUNT_PASSWORD = "server-only-test-password";
  assert.equal(
    (
      await POST(
        request("http://localhost:3000", { email: "other@example.test" }),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
  const response = await POST(request("http://localhost:3000"));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    { email: "demo@example.test", password: "server-only-test-password" },
  ]);
  assert.deepEqual(await response.json(), { authenticated: true });
});
