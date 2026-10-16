import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, apiRequest } from "../app/lib/accountApi.ts";

test("network failure is actionable and retains a typed error", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(apiRequest("/api/account"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    assert.equal(error.message, "Could not connect to Screeningroom. Check your connection and try again.");
    return true;
  });
});

test("API recovery details and status survive delivery to the UI", async (context) => {
  const payload = { error: "Confirm your email before signing in.", code: "EMAIL_UNCONFIRMED" };
  context.mock.method(globalThis, "fetch", async () => Response.json(payload, { status: 403 }));
  await assert.rejects(apiRequest("/api/auth/sign-in"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.message, payload.error);
    assert.deepEqual(error.data, payload);
    return true;
  });
});
