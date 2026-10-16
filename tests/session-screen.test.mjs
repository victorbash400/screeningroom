import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
const require = createRequire(import.meta.url);
const swc = require("next/dist/build/swc");
await swc.loadBindings();
const stub = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/RoomSession.tsx")) {
      if (specifier === "react") return stub('export const useEffect=()=>{};export const useLayoutEffect=()=>{};export const useRef=(value)=>({current:value});');
      if (specifier.endsWith("/AccountContext")) return stub('export const useAccount=()=>globalThis.screenAccount;');
      if (specifier.endsWith("/RoomDataContext")) return stub('export const RoomDataProvider=({children})=>children;');
      if (specifier === "./RoomApplication") return stub('import {createElement} from "react";export default function App(){return createElement("div",{"data-workspace":true},"Workspace")}');
      if (specifier.endsWith("/SignInDialog")) return stub('import {createElement} from "react";export default function Login({showForm}){return createElement("div",{"data-login":true,"data-form":showForm},"Sign in")}');
      if (specifier.endsWith("/ShortcutsDialog") || specifier === "./ErrorNotice") return stub('export default function Component(){return null}');
    }
    if (specifier === "next/link") return stub('import {createElement} from "react";export default function Link(props){return createElement("a",props)}');
    if (specifier.endsWith(".css")) return stub('export default new Proxy({}, {get:(_,name)=>String(name)});');
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      for (const extension of [".tsx", ".ts"]) {
        const file = new URL(specifier + extension, context.parentURL);
        if (existsSync(file)) return next(file.href, context);
      }
    }
    if (specifier === "react" && context.parentURL?.startsWith("data:")) return next(specifier, { ...context, parentURL: import.meta.url });
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".tsx")) return { format: "module", shortCircuit: true, source: swc.transformSync(readFileSync(fileURLToPath(url), "utf8"), { filename: fileURLToPath(url), jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "es6" } }).code };
    return next(url, context);
  },
});
const { default: RoomSession } = await import("../app/components/shell/RoomSession.tsx");
function render(overrides = {}, login = false) {
  globalThis.screenAccount = { user: null, ready: true, unavailable: true, error: "Screeningroom took too long to respond. Try again.", load() {}, setError() {}, open() {}, ...overrides };
  return renderToStaticMarkup(RoomSession({ login }));
}
test("initial session failure renders the centered recovery page with a login link", () => {
  const html = render();
  assert.ok(html.includes("404"));
  assert.ok(html.includes("Couldn’t open Screeningroom"));
  assert.ok(html.includes('href="/login"'));
  assert.ok(html.includes("Retry"));
  assert.equal(html.includes('data-login="true"'), false);
});
test("login remains reachable while session restoration is unavailable", () => {
  const html = render({}, true);
  assert.ok(html.includes('data-login="true"'));
  assert.ok(html.includes('data-form="true"'));
  assert.equal(html.includes("404"), false);
});
test("background connection failure leaves a verified workspace mounted", () => {
  const html = render({ user: { id: "account-a" } });
  assert.ok(html.includes('data-workspace="true"'));
  assert.equal(html.includes("404"), false);
});
