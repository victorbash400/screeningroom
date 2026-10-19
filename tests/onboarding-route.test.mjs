import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';

const stub = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return stub('');
  if (specifier === 'next/server') return next('next/server.js', context);
  if (specifier.endsWith('/server/auth')) return stub('export const requireSession=async()=>{if(globalThis.tourTest.unauthorized)throw Object.assign(new Error(),{name:"NotAuthorizedException"});return {user:{sub:globalThis.tourTest.user},account:{email:globalThis.tourTest.email}}};');
  if (context.parentURL?.endsWith('/server/onboarding.ts')) {
    if (specifier === './config') return stub('export const env=()=>"example-bucket";');
    if (specifier === './aws') return stub(`export const storage=()=>({send:async(command)=>{
      const state=globalThis.tourTest,input=command.input;
      if(state.failure)throw new Error('Storage unavailable');
      if(command.constructor.name==='PutObjectCommand'){state.records.set(input.Key,input.Body);return {};}
      if(!state.records.has(input.Key))throw Object.assign(new Error(),{name:'NoSuchKey'});
      return {Body:{transformToString:async()=>state.records.get(input.Key)}};
    }});`);
  }
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(url)) return next(url.href, context);
  }
  return next(specifier, context);
} });
const { GET, PUT } = await import('../app/api/onboarding/route.ts');
const request = origin => new Request('https://app.example/api/onboarding', { method: 'PUT', headers: { origin: origin ?? 'https://app.example' } });
function reset() { globalThis.tourTest = { user: 'alice', email: 'alice@example.com', records: new Map() }; process.env.DEMO_ACCOUNT_EMAIL = 'demo@example.com'; }

test('dismissal persists for the authenticated owner and is independent of other accounts', async () => {
  reset();
  assert.deepEqual(await (await GET()).json(), { demo: false, seen: false });
  assert.equal((await PUT(request())).status, 200);
  assert.deepEqual(await (await GET()).json(), { demo: false, seen: true });
  assert.ok(globalThis.tourTest.records.has('users/alice/preferences/walkthrough.json'));
  globalThis.tourTest.user = 'bob';
  assert.deepEqual(await (await GET()).json(), { demo: false, seen: false });
});
test('demo dismissal does not suppress the next demo session or store shared preference data', async () => {
  reset(); globalThis.tourTest.email = 'Demo@example.com';
  assert.equal((await PUT(request())).status, 200);
  assert.deepEqual(await (await GET()).json(), { demo: true, seen: false });
  assert.equal(globalThis.tourTest.records.size, 0);
});
test('origin, authentication and storage failures remain visible instead of becoming unseen preferences', async () => {
  reset();
  assert.equal((await PUT(request('https://other.example'))).status, 403);
  globalThis.tourTest.unauthorized = true;
  assert.equal((await GET()).status, 401);
  globalThis.tourTest.unauthorized = false; globalThis.tourTest.failure = true;
  assert.equal((await GET()).status, 503);
  assert.equal((await PUT(request())).status, 503);
  assert.equal(globalThis.tourTest.records.size, 0);
});
