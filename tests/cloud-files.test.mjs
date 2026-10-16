import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadCloudFile, readFileBlob, uploadRoomFiles, fileRequest } from '../app/lib/cloudFiles.ts';
const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch;});
test('uploads use a signed S3 URL and preserve bytes and MIME type',async()=>{
 const calls=[];
 globalThis.fetch=async(url,init)=>{
   calls.push({url,init});
   if(url==='/api/files/upload') return Response.json({id:'file-id',url:'https://storage.example/upload'});
   assert.equal(url,'https://storage.example/upload');assert.equal(init.method,'PUT');assert.equal(await init.body.text(),'Hello');assert.equal(init.headers['Content-Type'],'text/plain');
   return new Response(null,{status:200});
 };
 assert.equal(await uploadCloudFile(new Blob(['Hello'],{type:'text/plain'})),'cloud-file:file-id');
 assert.deepEqual(JSON.parse(calls[0].init.body),{size:5,contentType:'text/plain'});
});
test('cloud reads request an account-scoped signed download and return actual bytes',async()=>{
 globalThis.fetch=async url=>url==='/api/files?id=file-id'?Response.json({url:'https://storage.example/download'}):new Response('File bytes',{headers:{'Content-Type':'text/plain'}});
 assert.equal(await (await readFileBlob('cloud-file:file-id')).text(),'File bytes');
});
test('file requests refresh an expired session once',async()=>{
 const calls=[];let access=0;
 globalThis.fetch=async url=>{calls.push(url);if(url==='/api/auth/refresh')return Response.json({user:{id:'a'}});return ++access===1?Response.json({error:'Expired'},{status:401}):Response.json({ok:true});};
 assert.deepEqual(await fileRequest('/api/files?id=a'),{ok:true});assert.deepEqual(calls,['/api/files?id=a','/api/auth/refresh','/api/files?id=a']);
});
test('a rejected refresh is explicit and never starts an authentication loop',async()=>{
 const calls=[];globalThis.fetch=async url=>{calls.push(url);return Response.json({error:'Sign in again.'},{status:401});};
 await assert.rejects(fileRequest('/api/files?id=a'),{message:'Sign in again.'});assert.equal(calls.length,2);
});
test('migration uploads file bytes once across current content and version history',async()=>{
 let uploads=0;globalThis.fetch=async(url,init)=>{
   if(String(url).startsWith('data:'))return originalFetch(url,init);
   if(url==='/api/files/upload'){uploads++;return Response.json({id:'cloud',url:'https://storage.example/upload'});}
   return new Response(null,{status:200});
 };
 const content='data:text/plain;charset=utf-8,hello';const data={version:1,workspaces:[{id:'w',name:'w'}],conversations:[],nodes:[{id:'n',workspaceId:'w',parentId:null,name:'a.txt',kind:'file',content,versions:[{id:'v',content,size:5,createdAt:'2026-10-16T00:00:00.000Z'}],updatedAt:'2026-10-16T00:00:00.000Z'}]};
 const normalized=await uploadRoomFiles(data,new Map());assert.equal(uploads,1);assert.equal(normalized.nodes[0].content,'cloud-file:cloud');assert.equal(normalized.nodes[0].versions[0].content,'cloud-file:cloud');assert.equal(data.nodes[0].content,content);
});
test('a failed migration upload leaves the original data intact',async()=>{
 globalThis.fetch=async(url,init)=>String(url).startsWith('data:')?originalFetch(url,init):Response.json({error:'Unavailable'},{status:503});
 const data={version:1,workspaces:[],conversations:[],nodes:[{content:'data:text/plain,hello'}]};
 await assert.rejects(uploadRoomFiles(data,new Map()),{message:'Unavailable'});assert.equal(data.nodes[0].content,'data:text/plain,hello');
});
test('uploads are not rejected by the removed 100 MB application cap',async()=>{
 const blob=new Blob(['bytes']);Object.defineProperty(blob,'size',{value:100_000_001});
 globalThis.fetch=async(url,init)=>{
   if(url==='/api/files/upload'){assert.equal(JSON.parse(init.body).size,100_000_001);return Response.json({id:'large',url:'https://storage.example/upload'});}
   return new Response(null,{status:200});
 };
 assert.equal(await uploadCloudFile(blob),'cloud-file:large');
});
