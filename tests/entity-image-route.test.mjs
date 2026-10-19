import './helpers/qloo-fetch.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({ resolve(s,c,n) {
  if(s==='next/server')return n('next/server.js',c);
  if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const file=new URL(s+'.ts',c.parentURL);if(existsSync(file))return n(file.href,c);}
  return n(s,c);
},load(url,c,n){
  if(url.endsWith('/app/server/auth.ts'))return {format:'module',shortCircuit:true,source:'export async function requireUser(){if(!globalThis.imageTestSignedIn){const error=new Error("Sign in");error.name="NotAuthorizedException";throw error;}return {sub:"test-user"};}'};
  return n(url,c);
}});
const { GET } = await import('../app/api/entities/image/route.ts');
const id='a0642338-e780-4b75-817d-eb27dc768f05';
const original=globalThis.fetch;
process.env.QLOO_HACKATHON_API_SERVER_URL='https://qloo.example';
process.env.QLOO_HACKATHON_API_KEY='test-key';
const request = () => new Request(`http://localhost:3000/api/entities/image?id=${id}`);

test('public photo metadata is authenticated, cacheable and never exposes provider credentials',async()=>{
  globalThis.imageTestSignedIn=true;
  let fetched;
  globalThis.fetch=async url=>{fetched=url;return Response.json({results:[{entity_id:id.toUpperCase(),properties:{image:{url:'https://images.qloo.com/venue.jpg'}}}]});};
  try{
    const response=await GET(request());
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'private, max-age=3600');
    assert.equal(fetched.searchParams.get('entity_ids'),id);
    assert.deepEqual(await response.json(),{id,image:'https://images.qloo.com/venue.jpg'});
    globalThis.imageTestSignedIn=false;
    globalThis.fetch=async()=>{throw Error('Unauthenticated request must not reach Qloo');};
    assert.equal((await GET(request())).status,401);
  }finally{globalThis.fetch=original;delete globalThis.imageTestSignedIn;}
});
test('missing photos are distinct from invalid metadata and provider failures',async()=>{
  globalThis.imageTestSignedIn=true;
  try{
    globalThis.fetch=async()=>Response.json({results:[{entity_id:id,properties:{image:null}}]});
    assert.deepEqual(await (await GET(request())).json(),{id,image:null});
    globalThis.fetch=async()=>Response.json({results:[{entity_id:id,properties:{image:{url:'file:///private/photo.jpg'}}}]});
    const invalid=await GET(request());assert.equal(invalid.status,502);assert.equal(invalid.headers.get('cache-control'),'no-store');
    globalThis.fetch=async()=>Response.json({results:[]});assert.equal((await GET(request())).status,404);
    assert.equal((await GET(new Request('http://localhost:3000/api/entities/image?id=not-an-id'))).status,400);
  }finally{globalThis.fetch=original;delete globalThis.imageTestSignedIn;}
});
