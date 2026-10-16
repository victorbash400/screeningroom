import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    return next(
      context.parentURL?.endsWith("/demoAccount.ts") &&
        specifier === "./accountApi"
        ? "./accountApi.ts"
        : specifier,
      context,
    );
  },
});
const { demoAccount } = await import("../app/lib/demoAccount.ts");

test("demo requests only the fill endpoint and returns editable field values", async () => {
  const requests = [];
  globalThis.fetch = async (path, init) => {
    requests.push({ path, body: JSON.parse(init.body) });
    return Response.json({
      email: "demo@example.test",
      password: "demo-test-password",
    });
  };
  assert.deepEqual(await demoAccount(), {
    email: "demo@example.test",
    password: "demo-test-password",
  });
  assert.deepEqual(requests, [{ path: "/api/auth/demo", body: {} }]);
});
test("demo rejects incomplete credentials without inventing defaults", async () => {
  for (const value of [
    { email: "demo@example.test" },
    { email: "", password: "test" },
    { email: "demo@example.test", password: 3 },
  ]) {
    globalThis.fetch = async () => Response.json(value);
    await assert.rejects(demoAccount(), {
      message: "Demo credentials are invalid.",
    });
  }
});
