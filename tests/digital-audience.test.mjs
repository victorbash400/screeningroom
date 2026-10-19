import './helpers/qloo-fetch.mjs';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const { digitalAudienceTool } = await import('../app/tools/digital-audience.ts');
const { agentBlocks } = await import('../app/lib/agentActivity.ts');
const { emptyData, parseData } = await import('../app/lib/storage.ts');
const ref='18b098fd-3d84-4609-bff3-adf9a0b00e40', movie='c6046119-7760-4733-b84e-374e029b14dc', brand='866e0085-3c8e-4780-ba28-b837cafc3d6b';
const input={title:'Digital audience',type:'movie',platformIds:['hulu'],entityIds:[ref],tagIds:[],requiredTagIds:[],take:3};
const options={toolCallId:'digital',messages:[]};

test('digital research preserves comparable reception, platform affinity, source links and actual query provenance through storage',async()=>{
 const fetchBefore=globalThis.fetch;
 const envBefore=[process.env.QLOO_HACKATHON_API_SERVER_URL,process.env.QLOO_HACKATHON_API_KEY];
 process.env.QLOO_HACKATHON_API_SERVER_URL='https://qloo.invalid';process.env.QLOO_HACKATHON_API_KEY='test';
 let brandSearches=0, failPlatforms=false, failComparables=false;
 globalThis.fetch=async url=>{
  if(url.pathname==='/search'){brandSearches++;return Response.json({results:[{entity_id:brand,name:'Hulu',types:['urn:entity:brand']}]});}
  if(url.pathname==='/entities'&&url.searchParams.get('entity_ids')===ref)return Response.json({results:[{entity_id:ref,name:'Inception'}]});
  if(url.pathname==='/entities')return Response.json({results:[{entity_id:movie,name:'The Matrix',popularity:.9,tags:[],properties:{external:{imdb:{id:'tt0133093',user_rating:8.7,user_rating_count:2000}}}}]});
  assert.equal(url.searchParams.get('feature.explainability'),'true');
  if(url.searchParams.get('filter.type')==='urn:entity:brand'){
   if(failPlatforms)return Response.json({error:'throttled'},{status:429});
   assert.equal(url.searchParams.get('filter.results.entities'),brand);
   return Response.json({success:true,results:{entities:[{entity_id:brand,name:'Hulu',subtype:'urn:entity:brand',query:{affinity:.8,explainability:{'signal.interests.entities':[{entity_id:ref,score:1}]}}}]}});
  }
  if(failComparables)return Response.json({error:'throttled'},{status:429});
  assert.equal(url.searchParams.get('filter.exclude.entities'),ref);
  return Response.json({success:true,results:{entities:[{entity_id:movie,name:'The Matrix',query:{affinity:.95,explainability:{'signal.interests.entities':[{entity_id:ref,score:1}]}},external:{netflix:[{id:'20557937'}]}}]}});
 };
 try{
  const tool=digitalAudienceTool(x=>x);
  const result=await tool.execute(input,options);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.platforms.subjects[0].metrics[0].value,.8);
  assert.deepEqual(result.platforms.subjects[0].contributors,[{id:ref,name:'Inception',score:1}]);
  assert.equal(tool.toModelOutput({output:result,toolCallId:'digital',input}).value.platforms.subjects[0].contributors[0].name,'Inception');
  assert.equal(result.comparables.subjects[0].metrics.find(x=>x.key==='imdbRating').value,8.7);
  assert.equal(result.comparables.subjects[0].links[0].url,'https://www.netflix.com/title/20557937');
  assert.deepEqual(result.comparables.subjects[0].contributors,[{id:ref,score:1}]);
  assert.ok(result.comparables.metricComparisons.every(x=>x.key!=='affinity'));
  assert.ok(!result.platforms.subjects[0].metrics.some(x=>x.key==='views'));
  const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-analyzeDigitalAudience',toolCallId:'digital',state:'output-available',input,output:result}]});
  const data={...emptyData,workspaces:[{id:'w',name:'Work'}],conversations:[{id:'c',workspaceId:'w',title:'Audience',draft:'',messages:[{id:'m',role:'assistant',text:'Supported platform comparison.',createdAt:new Date().toISOString(),blocks:[...blocks,{id:'text',kind:'text',text:'Supported platform comparison.'}]}]}]};
  assert.deepEqual(parseData(JSON.stringify(data)).conversations[0].messages[0].blocks[0].tool.research,result);
  assert.deepEqual(blocks[0].tool.trace.input,input);
  const next=await tool.execute(input,options);
  assert.equal(brandSearches,1);
  assert.equal(next.platforms.searches[0].cached,true);
  failPlatforms=true;
  const partial=await tool.execute(input,options);
  assert.equal(partial.platforms,undefined);
  assert.equal(partial.comparables.subjects.length,1);
  assert.ok(partial.errors[0].message.includes('rate limiting'));
  failComparables=true;
  await assert.rejects(tool.execute(input,options),{message:'Platforms: Qloo is temporarily rate limiting requests. Try again shortly. Comparables: Qloo is temporarily rate limiting requests. Try again shortly.'});
 }finally{globalThis.fetch=fetchBefore;['QLOO_HACKATHON_API_SERVER_URL','QLOO_HACKATHON_API_KEY'].forEach((key,i)=>envBefore[i]===undefined?delete process.env[key]:process.env[key]=envBefore[i]);}
});

test('platform performance compares measured exports by platform with weighted rates, independently of Qloo scores', async()=>{
 const {mediaResearchTools}=await import('../app/tools/media-research.ts');
 const csv='platform,impressions,clicks,views\nYouTube,1000,100,300\nYouTube,9000,90,1000\nVimeo,2000,80,500';
 const file={id:'analytics',name:'Platform analytics.csv',kind:'file',mimeType:'text/csv'};
 const tools=mediaResearchTools('owner',['analytics'],{node:async id=>{assert.equal(id,'analytics');return file;},text:async()=>csv,evidence:async()=>undefined});
 const result=await tools.analyzeProjectPerformance.execute({fileId:'analytics',columns:{impressions:'impressions',clicks:'clicks',views:'views'},groupBy:'platform'},options);
 const youtube=result.subjects.find(s=>s.name==='YouTube');
 assert.equal(youtube.metrics.find(m=>m.key==='ctr').value,1.9);
 assert.equal(youtube.metrics.find(m=>m.key==='views').value,1300);
 assert.ok(youtube.metrics.every(m=>m.source!=='Qloo'));
 assert.equal(result.subjects.find(s=>s.name==='Vimeo').metrics.find(m=>m.key==='ctr').value,4);
});
