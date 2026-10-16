import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
const stub = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith("/server/auth.ts")) {
    if (specifier === "next/headers") return stub('export async function cookies(){return {get(){return {value:"test-access"}}}}');
    if (specifier === "aws-jwt-verify") return stub('export const CognitoJwtVerifier={create(){return {async verify(){if(globalThis.authFixture.verifyError)throw globalThis.authFixture.verifyError;return globalThis.authFixture.claims}}}}');
    if (specifier === "./aws") return stub('export function identity(){return {async send(command){globalThis.authFixture.commands.push(command);if(globalThis.authFixture.providerError)throw globalThis.authFixture.providerError;return {UserAttributes:[{Name:"sub",Value:"a"},{Name:"email",Value:"a@example.test"},{Name:"name",Value:"Account"},{Name:"email_verified",Value:"true"}]}}}}');
    if (specifier === "./account-state") return stub('export async function assertAccountActive(){globalThis.authFixture.activeChecks++}');
    if (specifier === "./config") return stub('export function authConfig(){return {poolId:"test-pool",clientId:"test-client"}}');
    if (specifier === "./aws-dns") return next("./aws-dns.ts", context);
    if (specifier === "./auth-operation") return next("./auth-operation.ts", context);
    if (specifier === "./http") return next("./http.ts", context);
  }
  return next(specifier === "next/server" ? "next/server.js" : specifier, context);
} });
const { requireSession, requireUser } = await import("../app/server/auth.ts");
function fixture() { return globalThis.authFixture = { commands: [], activeChecks: 0, claims: { sub: "a", exp: Math.floor(Date.now() / 1000) + 3600 } }; }
test("verified session uses one Cognito lookup and retains the account-state guard", async () => {
  const f = fixture();
  const result = await requireSession();
  assert.equal(f.commands.length, 1);
  assert.equal(f.commands[0].input.AccessToken, "test-access");
  assert.equal(f.activeChecks, 1);
  assert.equal(result.user.sub, "a");
  assert.equal(result.account.email, "a@example.test");
});
test("existing requireUser callers retain verified JWT claims", async () => {
  const f = fixture();
  assert.deepEqual(await requireUser(), f.claims);
  assert.equal(f.commands.length, 1);
  assert.equal(f.activeChecks, 1);
});
test("Cognito rejection still prevents access", async () => {
  const f = fixture();
  f.providerError = Object.assign(new Error("Revoked"), { name: "NotAuthorizedException" });
  await assert.rejects(requireSession(), { name: "NotAuthorizedException" });
  assert.equal(f.activeChecks, 0);
});
