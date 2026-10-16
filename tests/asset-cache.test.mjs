import assert from 'node:assert/strict';
import test from 'node:test';
import {AssetCache,chunkBytes,cachePrefix} from '../public/asset-cache.js';
import {requestedRange,storageRange} from '../public/asset-range.js';
class MemoryCache {
 values=new Map();
 async match(key){return this.values.get(typeof key==='string'?key:key.url)?.clone();}
 async put(key,response){this.values.set(typeof key==='string'?key:key.url,response.clone());}
 async keys(){return [...this.values.keys()].map(url=>({url}));}
 async delete(key){return this.values.delete(typeof key==='string'?key:key.url);}
}
function fixture(size=chunkBytes*4+17){
 const stores=new Map(),calls=[];const bytes=new Uint8Array(size);for(let i=0;i<size;i++)bytes[i]=i%251;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new MemoryCache());return stores.get(name);},async delete(name){return stores.delete(name);}};
 const fetch=async(url,init)=>{
  calls.push({url,range:init.headers.Range});const [start,end]=init.headers.Range.slice(6).split('-').map(Number);
  if(!size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */0'}});
  return new Response(bytes.slice(start,Math.min(size,end+1)),{status:206,headers:{'Content-Range':`bytes ${start}-${Math.min(end,size-1)}/${size}`,'Content-Type':'video/mp4'}});
 };
 const options={caches,fetch,getUrl:async(owner,id)=>`https://storage.example/${owner}/${id}`,origin:'https://app.example'};
 return {engine:new AssetCache(options),options,stores,calls,bytes};
}
const request=(range,method='GET')=>new Request('https://app.example/__media__/a/file',{method,headers:range?{Range:range}:{}});
test('range parsing handles full, open, bounded and suffix requests',()=>{
 assert.deepEqual(requestedRange(null,100),{start:0,end:99,partial:false});
 assert.deepEqual(requestedRange('bytes=20-',100),{start:20,end:99,partial:true});
 assert.deepEqual(requestedRange('bytes=20-999',100),{start:20,end:99,partial:true});
 assert.deepEqual(requestedRange('bytes=-20',100),{start:80,end:99,partial:true});
 for(const value of ['bytes=100-','bytes=20-10','bytes=x-20','bytes=1-2,3-4','bytes=-0','items=1-2','bytes=1.5-2','bytes=1--2'])assert.equal(requestedRange(value,100),null,value);
 assert.throws(()=>storageRange('bytes 0-9/5'));
});
test('cold playback returns a stream after one chunk instead of downloading the asset',async()=>{
 const f=fixture();const response=await f.engine.respond('a','file',request('bytes=0-'));
 assert.equal(response.status,206);assert.equal(f.calls.length,1);assert.equal(response.headers.get('Content-Length'),String(f.bytes.length));
 const reader=response.body.getReader();const first=await reader.read();assert.equal(first.value.byteLength,chunkBytes);assert.equal(f.calls.length,1);
 await reader.cancel();assert.equal(f.calls.length,1);
});
test('seeking fetches only the relevant chunk and returns exact bytes',async()=>{
 const f=fixture();const start=chunkBytes*2+11,end=start+24;
 const response=await f.engine.respond('a','file',request(`bytes=${start}-${end}`));
 assert.equal(response.headers.get('Content-Range'),`bytes ${start}-${end}/${f.bytes.length}`);
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),f.bytes.slice(start,end+1));
 assert.deepEqual(f.calls.map(call=>call.range),[`bytes=0-${chunkBytes-1}`,`bytes=${chunkBytes*2}-${chunkBytes*3-1}`]);
});
test('warm playback reuses persistent chunks after the worker restarts',async()=>{
 const f=fixture();await f.engine.warm('a','file');const count=f.calls.length;
 const restarted=new AssetCache(f.options);const response=await restarted.respond('a','file',request('bytes=0-100'));
 assert.equal((await response.arrayBuffer()).byteLength,101);assert.equal(f.calls.length,count);
});
test('background warming reads the beginning and end without downloading the middle',async()=>{
 const f=fixture();await f.engine.warm('a','file');assert.equal(f.calls.length,2);
 assert.equal(f.calls[0].range,`bytes=0-${chunkBytes-1}`);assert.equal(f.calls[1].range,`bytes=${chunkBytes*4}-${chunkBytes*5-1}`);
});
test('newly uploaded bytes can be replayed with no storage download',async()=>{
 const f=fixture();await f.engine.seed('a','upload',new Blob([f.bytes],{type:'video/mp4'}));
 const response=await f.engine.respond('a','upload',request(`bytes=${chunkBytes+3}-${chunkBytes+9}`));
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),f.bytes.slice(chunkBytes+3,chunkBytes+10));assert.equal(f.calls.length,0);
});
test('cache entries are isolated by account even when file identifiers match',async()=>{
 const f=fixture();await f.engine.seed('a','same',new Blob(['Private A']));await f.engine.seed('b','same',new Blob(['Private B']));
 assert.equal(await(await f.engine.respond('a','same',request())).text(),'Private A');
 assert.equal(await(await f.engine.respond('b','same',request())).text(),'Private B');
 await f.engine.clear('a');assert.equal(f.stores.has(cachePrefix+'a'),false);assert.equal(f.stores.has(cachePrefix+'b'),true);
 await assert.rejects(f.engine.respond('a','same',request()),{message:'Account session changed.'});
});
test('overlapping requests deduplicate chunk downloads',async()=>{
 const f=fixture();await Promise.all([f.engine.warm('a','file'),f.engine.warm('a','file')]);assert.equal(f.calls.length,2);
});
test('partial response bodies are returned exactly across chunk boundaries',async()=>{
 const f=fixture();const start=chunkBytes-10,end=chunkBytes+10;
 const response=await f.engine.respond('a','file',request(`bytes=${start}-${end}`));
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),f.bytes.slice(start,end+1));
});
test('empty files and invalid ranges return correct HTTP lengths',async()=>{
 const f=fixture(0);assert.equal(await(await f.engine.respond('a','empty',request())).text(),'');
 assert.equal((await f.engine.respond('a','empty',request('bytes=0-'))).status,416);
 const g=fixture(30);const invalid=await g.engine.respond('a','file',request('bytes=100-'));assert.equal(invalid.status,416);assert.equal(invalid.headers.get('Content-Range'),'bytes */30');
 const head=await g.engine.respond('a','file',request(undefined,'HEAD'));assert.equal(head.body,null);assert.equal(head.headers.get('Content-Length'),'30');
});
test('a complete explicit download reconstructs the file from chunked streaming',async()=>{
 const f=fixture();const response=await f.engine.respond('a','file',request());assert.deepEqual(new Uint8Array(await response.arrayBuffer()),f.bytes);assert.equal(f.calls.length,5);
});
test('storage errors never become a successful or empty media response',async()=>{
 const f=fixture();f.engine.fetch=async()=>new Response('Unavailable',{status:503});await assert.rejects(f.engine.respond('a','file',request()),{message:'Asset range request failed (503).'});
});
