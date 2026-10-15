import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === "next/server" ? "next/server.js" : specifier, context);
  },
});

const { failure } = await import("../app/server/http.ts");

test("unconfirmed email has a stable recovery code and preserves its status and label", async () => {
  const error = new Error("Provider details must not leak");
  error.name = "UserNotConfirmedException";
  const response = failure(error);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Confirm your email before signing in.",
    code: "EMAIL_UNCONFIRMED",
  });
});

test("incorrect credentials retain their existing response", async () => {
  const error = new Error();
  error.name = "NotAuthorizedException";
  const response = failure(error);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Email or password is incorrect, or the session expired.",
  });
});
