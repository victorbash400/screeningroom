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

test("unexpected service failures keep internal details out of the message", async () => {
  const response = failure(new Error("Private provider details"));
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error, "Screeningroom could not complete the request. Try again.");
  assert.equal(payload.code, "Error");
});

test("transport timeouts provide a distinct recovery message", async () => {
  const response = failure(new Error("Private endpoint", { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }));
  assert.equal(response.status, 504);
  const payload = await response.json();
  assert.equal(payload.error, "Screeningroom took too long to respond. Try again.");
  assert.equal(payload.code, "UND_ERR_CONNECT_TIMEOUT");
});
