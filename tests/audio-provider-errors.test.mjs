import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import test from 'node:test';
const bedrockStub='data:text/javascript,'+encodeURIComponent('export async function bedrockHeaders(){return {};} export function bedrockFetch(...args){return globalThis.audioProviderFetch(...args);}');
registerHooks({resolve(s,c,n){
 if(c.parentURL?.endsWith('/server/media-model.ts')&&s==='./bedrock')return n(bedrockStub,c);
 if(s==='next/server')return n('next/server.js',c);
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const url=new URL(s+'.ts',c.parentURL);if(existsSync(url))return n(url.href,c);}
 return n(s,c);
}});
process.env.BEDROCK_BASE_URL='https://audio.example.invalid';
const {transcribeClip}=await import('../app/server/media-model.ts');
test('audio provider internal errors stay distinct from capacity failures without automatic retries',async()=>{
 for(const status of [500,502,503,429]){
  let calls=0;
  globalThis.audioProviderFetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:'Provider failure',type:'server_error',code:'internal_server_error'}}),{status,headers:{'content-type':'application/json'}});};
  await assert.rejects(transcribeClip(new Uint8Array([1,2,3])),{status:status===503||status===429?503:502,message:status===503||status===429?'Audio model is at capacity. Try again later.':'Audio provider failed to process this recording. Try again later.'});
  assert.equal(calls,1);
 }
});
