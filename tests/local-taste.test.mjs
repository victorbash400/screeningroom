import "./helpers/qloo-fetch.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import{registerHooks}from'node:module';import{existsSync}from'node:fs';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const{localTasteTool}=await import('../app/tools/local-taste.ts');const{agentBlocks}=await import('../app/lib/agentActivity.ts');
const area={name:'London',latitude:51.5,longitude:-.12,radius:5000};
test('local taste uses geographic signals rather than media filters and keeps chart evidence in saved tool blocks',async()=>{
 const before=globalThis.fetch;const keys=['QLOO_HACKATHON_API_SERVER_URL','QLOO_HACKATHON_API_KEY'];const previous=keys.map(k=>process.env[k]);process.env[keys[0]]='https://qloo.invalid';process.env[keys[1]]='test';
 let request,remembered;globalThis.fetch=async url=>{request=url;return Response.json({success:true,results:{entities:[{entity_id:'a',name:'An artist',query:{affinity:.82}}]}});};
 try{const tool=localTasteTool(area,v=>{remembered=v;return v;});const output=await tool.execute({type:'artist',take:8},{toolCallId:'t',messages:[]});assert.equal(request.searchParams.get('signal.location'),'POINT(-0.12 51.5)');assert.equal(request.searchParams.has('filter.location'),false);assert.equal(request.searchParams.has('signal.location.radius'),false);assert.equal(output.series[0].points[0].value,.82);assert.equal(output.unit,'index');assert.equal(remembered,output);assert.ok(output.basis.includes('within this query'));const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-getLocalTaste',toolCallId:'t',state:'output-available',input:{},output}]});assert.equal(blocks[0].tool.research.kind,'chart');
 globalThis.fetch=async()=>Response.json({success:true,results:{entities:[]}});await assert.rejects(tool.execute({type:'movie',take:8},{toolCallId:'t',messages:[]}),{message:'Qloo returned no local taste results for this query.'});
 globalThis.fetch=async()=>Response.json({success:true,results:{entities:[{entity_id:'b',name:'Missing affinity'}]}});await assert.rejects(tool.execute({type:'movie',take:8},{toolCallId:'t',messages:[]}),{message:'Qloo local taste results are missing affinity values.'});
 }finally{globalThis.fetch=before;keys.forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);}
});
