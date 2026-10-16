import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {parseConnectionHealth} from '../app/lib/connections.ts';
const stub=source=>({url:`data:text/javascript,${encodeURIComponent(source)}`,shortCircuit:true});
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/server')return next('next/server.js',context);
 if(context.parentURL?.endsWith('/api/health/route.ts')){
  if(specifier.endsWith('/server/auth'))return stub('export const requireUser=async()=>({sub:"owner"});');
  if(specifier.endsWith('/server/connections'))return stub('export const connectionStatus=async(id,owner,probe)=>{globalThis.connectionChecks.push({id,owner,probe});if(globalThis.connectionFailure===id)throw new Error("Provider unavailable");return probe||id==="database"||id==="storage"||id==="auth"?"connected":"configured";};');
 }
 if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){const url=new URL(specifier+'.ts',context.parentURL);if(existsSync(url))return next(url.href,context);}
 return next(specifier,context);
}});
const {GET}=await import('../app/api/health/route.ts');
test('initial connection status describes all services without invoking model or Qloo probes',async()=>{
 globalThis.connectionChecks=[];
 const response=await GET(new Request('https://app.example/api/health'));
 const data=await response.json();
 assert.equal(response.status,200);
 assert.deepEqual(Object.keys(parseConnectionHealth(data)),['auth','database','storage','bedrock','qloo']);
 assert.equal(globalThis.connectionChecks.length,5);
 assert.ok(globalThis.connectionChecks.every(check=>!check.probe&&check.owner==='owner'));
});
test('an individual check probes only its own service',async()=>{
 globalThis.connectionChecks=[];
 const response=await GET(new Request('https://app.example/api/health?service=qloo'));
 const data=await response.json();
 assert.deepEqual(globalThis.connectionChecks,[{id:'qloo',owner:'owner',probe:true}]);
 assert.deepEqual(parseConnectionHealth(data,'qloo'),{qloo:'connected'});
});
test('failed checks return an explicit unavailable status without fabricating other results',async()=>{
 globalThis.connectionChecks=[];globalThis.connectionFailure='storage';
 try {
  const response=await GET(new Request('https://app.example/api/health?service=storage'));
  assert.equal(response.status,503);
  assert.deepEqual(parseConnectionHealth(await response.json(),'storage'),{storage:'unavailable'});
 } finally {globalThis.connectionFailure=undefined;}
});
test('invalid status data and unknown connection names are rejected',async()=>{
 assert.throws(()=>parseConnectionHealth({status:'ok',services:{}},'qloo'));
 const response=await GET(new Request('https://app.example/api/health?service=unknown'));
 assert.equal(response.status,400);
});
