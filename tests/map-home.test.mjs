import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";

const stub = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return next("next/server.js", context);
  if (context.parentURL?.endsWith("/api/locations/home/route.ts")) {
    if (specifier.endsWith("/server/auth")) return stub("export const requireUser=async()=>({sub:globalThis.homeTest.user});");
    if (specifier.endsWith("/server/records")) return stub(`
      export const getRecord=async(user,kind,id)=>globalThis.homeTest.records.get(user+kind+id);
      export const putRecord=async(user,kind,id,value,revision)=>{
        const key=user+kind+id;
        const previous=globalThis.homeTest.records.get(key);
        if ((previous?.version??0)!==revision) { const error=new Error(); error.name="ConditionalCheckFailedException"; throw error; }
        const item={value,version:revision+1}; globalThis.homeTest.records.set(key,item); return item;
      };
    `);
  }
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const url = new URL(specifier + ".ts", context.parentURL);
    if (existsSync(url)) return next(url.href, context);
  }
  return next(specifier, context);
} });
const { GET, PUT } = await import("../app/api/locations/home/route.ts");
const home = { name: "Nairobi", latitude: -1.2921, longitude: 36.8219 };
const request = (value, origin = "https://app.example") => new Request("https://app.example/api/locations/home", {
  method: "PUT", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(value),
});

test("home persists across reads, remains account scoped, and rejects stale browser writes", async () => {
  globalThis.homeTest = { user: "alice", records: new Map() };
  assert.deepEqual(await (await GET()).json(), { home: null, revision: 0 });
  assert.equal((await PUT(request({ home, revision: 0 }))).status, 200);
  assert.deepEqual(await (await GET()).json(), { home, revision: 1 });
  globalThis.homeTest.user = "bob";
  assert.deepEqual(await (await GET()).json(), { home: null, revision: 0 });
  globalThis.homeTest.user = "alice";
  assert.equal((await PUT(request({ home: { ...home, name: "Stale home" }, revision: 0 }))).status, 409);
  assert.deepEqual(await (await GET()).json(), { home, revision: 1 });
});

test("invalid coordinates and cross-origin writes cannot save a home location", async () => {
  globalThis.homeTest = { user: "alice", records: new Map() };
  assert.equal((await PUT(request({ home: { ...home, latitude: 91 }, revision: 0 }))).status, 400);
  assert.equal((await PUT(request({ home, revision: 0 }, "https://other.example"))).status, 403);
  assert.equal(globalThis.homeTest.records.size, 0);
});
