import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';

const stub = (source) => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'next/server') return next('next/server.js', context);
  if (context.parentURL?.endsWith('/api/chat/title/route.ts')) {
    if (specifier.endsWith('/server/auth')) return stub('export const requireUser=async()=>{globalThis.titleChecks.auth++;};');
    if (specifier.endsWith('/server/bedrock')) return stub('export const chatModel=async()=>"current-chat-model";');
    if (specifier === 'ai') return stub('export const Output={object:({schema})=>schema};export const generateText=async(options)=>{globalThis.titleChecks.options=options;return {output:options.output.parse({title:"Science Fiction Films"})};};');
  }
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(url)) return next(url.href, context);
  }
  return next(specifier, context);
} });
const { POST } = await import('../app/api/chat/title/route.ts');
const request = (value, origin = 'https://app.example') => new Request('https://app.example/api/chat/title', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(value),
});

test('title endpoint authenticates and makes a separate structured call to the current model', async () => {
  globalThis.titleChecks = { auth: 0 };
  const exchange = { user: 'Find science fiction films', assistant: 'Try Arrival.' };
  const response = await POST(request(exchange));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { title: 'Science Fiction Films' });
  assert.equal(globalThis.titleChecks.auth, 1);
  const options = globalThis.titleChecks.options;
  assert.equal(options.model, 'current-chat-model');
  assert.deepEqual(JSON.parse(options.prompt), exchange);
  assert.equal(options.tools, undefined);
  assert.equal(options.maxRetries, 0);
});

test('invalid exchange and cross-origin requests cannot invoke the title model', async () => {
  globalThis.titleChecks = { auth: 0 };
  assert.equal((await POST(request({ user: 'Hello', assistant: '' }))).status, 400);
  assert.equal((await POST(request({ user: 'Hello', assistant: 'Hi' }, 'https://other.example'))).status, 403);
  assert.equal(globalThis.titleChecks.options, undefined);
});
