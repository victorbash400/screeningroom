import './helpers/qloo-fetch.mjs';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const { audienceVenues }=await import('../app/server/audience-venues.ts');
const { withQlooRequestReuse }=await import('../app/server/qloo-request-cache.ts');
const { qlooJson }=await import('../app/tools/qloo.ts');
const { mapPresentationSchema }=await import('../app/lib/mapScene.ts');
const { compareAudienceSignals }=await import('../app/tools/compare-audience.ts');
const ids=['18b098fd-3d84-4609-bff3-adf9a0b00e40','057da9d9-399b-437e-8bca-a80e499125ef'];
const area={name:'London',latitude:51.5072,longitude:-.1276,radius:10000,venueTypes:['cinema']};
async function fixture(fetcher,run){const previous=globalThis.fetch;const env=[process.env.QLOO_HACKATHON_API_SERVER_URL,process.env.QLOO_HACKATHON_API_KEY];process.env.QLOO_HACKATHON_API_SERVER_URL='https://qloo.invalid';process.env.QLOO_HACKATHON_API_KEY='test';globalThis.fetch=fetcher;try{return await run();}finally{globalThis.fetch=previous;['QLOO_HACKATHON_API_SERVER_URL','QLOO_HACKATHON_API_KEY'].forEach((key,i)=>env[i]===undefined?delete process.env[key]:process.env[key]=env[i]);}}

test('venue explanations retain real reference influences, distance, provider profile and actual category',async()=>{
 await fixture(async url=>{
  if(url.pathname==='/entities')return Response.json({results:ids.map((entity_id,index)=>({entity_id,name:index?'Interstellar':'Inception'}))});
  assert.equal(url.searchParams.get('feature.explainability'),'true');
  assert.equal(url.searchParams.get('filter.location.radius'),'10000');
  return Response.json({success:true,results:{entities:[{entity_id:'a0642338-e780-4b75-817d-eb27dc768f05',name:'Venue',location:{lat:51.5,lon:-.12},properties:{primary_genre:{name:'Arena'},customer_demographics_description:'Provider-described visitor mix.'},query:{affinity:.83,distance:1200,explainability:{'signal.interests.entities':ids.map((entity_id,i)=>({entity_id,score:i?.45:.55}))}}}]}});
 },async()=>{
  const result=await audienceVenues(area,ids);
  assert.equal(result.locations[0].category,'Arena');
  assert.equal(result.locations[0].distanceMeters,1200);
  assert.equal(result.locations[0].audienceProfile,'Provider-described visitor mix.');
  assert.deepEqual(result.locations[0].contributions.map(c=>[c.name,c.score]),[['Inception',.55],['Interstellar',.45]]);
  assert.equal(result.locations[0].affinity,.83);
  assert.equal(mapPresentationSchema.parse({locations:result.locations}).locations[0].contributions[0].name,'Inception');
 });
});

test('same-turn Qloo requests deduplicate despite parameter order; failed calls are never retained',async()=>{
 let count=0,fail=false;
 await fixture(async()=>{count++;if(fail)return Response.json({error:'unavailable'},{status:503});return Response.json({results:[]});},async()=>{
  const tools=withQlooRequestReuse({first:{execute:()=>qlooJson('/search',{query:'Film',take:'3'})},second:{execute:()=>qlooJson('/search',{take:'3',query:'Film'})}});
  await Promise.all([tools.first.execute(),tools.second.execute()]);
  await tools.first.execute();assert.equal(count,1);
  const next=withQlooRequestReuse({first:{execute:()=>qlooJson('/search',{query:'Film',take:'3'})}});
  fail=true;await assert.rejects(next.first.execute());assert.equal(count,2);
  fail=false;await next.first.execute();assert.equal(count,3);
 });
});

test('taste comparison shows requested strongest real traits without manufacturing audience overlap',async()=>{
 await fixture(async()=>Response.json({results:{tags:[{name:'Low',query:{score:.2}},{name:'High',query:{score:.9}},{name:'Middle',query:{score:.5}}]}}),async()=>{
  const result=await compareAudienceSignals.execute({title:'Comparable taste traits',first:[ids[0]],second:[ids[1]],take:2},{toolCallId:'compare',messages:[]});
  assert.deepEqual(result.series[0].points,[{label:'High',value:.9},{label:'Middle',value:.5}]);
  assert.ok(result.basis.includes('not shared-viewer percentages'));
 });
});

test('audio structured output rejects punctuation placeholders while preserving speech and explicit no-speech',async()=>{
 const { transcriptionSchema }=await import('../app/server/media-model.ts');
 assert.equal(transcriptionSchema.safeParse({transcript:':[',uncertainties:['--']}).success,false);
 assert.equal(transcriptionSchema.safeParse({transcript:'',uncertainties:[]}).success,true);
 assert.equal(transcriptionSchema.safeParse({transcript:'Here are the elephants.',uncertainties:[]}).success,true);
 assert.equal(transcriptionSchema.safeParse({transcript:'こんにちは',uncertainties:[]}).success,true);
});

test('comparison chart evidence can be reused without a second provider request',async()=>{
 const {mediaResearchTools}=await import('../app/tools/media-research.ts');
 let requests=0;
 await fixture(async()=>{requests++;return Response.json({results:{tags:[{name:'Sci-Fi',query:{score:.73}}]}});},async()=>{
  const tools=mediaResearchTools('owner',[],{evidence:async()=>undefined});
  const options={toolCallId:'reuse',messages:[]};
  const first=await tools.compareAudienceSignals.execute({title:'Reference traits',first:[ids[0]],second:[ids[1]],take:3},options);
  const again=await tools.renderEvidenceChart.execute({evidenceId:first.evidenceId,metric:'Comparison score',view:'bar'},options);
  assert.deepEqual(again.series,first.series);assert.equal(requests,1);
 });
});

test('an agent cannot query invented signals; real lookup results and structured history unlock only returned IDs',async()=>{
 let requests=0;
 const tag='urn:tag:genre:media:documentary';
 await fixture(async url=>{requests++;if(url.pathname==='/v2/tags')return Response.json({results:{tags:[{id:tag,name:'Documentary'}]}});return Response.json({results:[]});},async()=>{
  const tools=withQlooRequestReuse({lookup:{execute:()=>qlooJson('/v2/tags',{'filter.query':'documentary'})},query:{execute:()=>qlooJson('/v2/insights',{'signal.interests.tags':tag})},invented:{execute:()=>qlooJson('/v2/insights',{'signal.interests.tags':'urn:tag:made-up'})}});
  await assert.rejects(tools.query.execute(),{status:400});assert.equal(requests,0);
  await tools.lookup.execute();await tools.query.execute();assert.equal(requests,2);
  await assert.rejects(tools.invented.execute(),{status:400});assert.equal(requests,2);
  const followup=withQlooRequestReuse({query:{execute:()=>qlooJson('/v2/insights',{'signal.interests.entities':ids[0],'signal.interests.tags':tag})}},[{name:'searchEntities',output:[{entity_id:ids[0],name:'Inception'}]},{name:'searchAudienceTags',output:[{id:tag,name:'Documentary'}]}]);
  await followup.query.execute();assert.equal(requests,3);
 });
});

test('resolved tag identity survives stream traces and saved history for a later turn',async()=>{
 const {agentBlocks}=await import('../app/lib/agentActivity.ts');const {chatHistory}=await import('../app/lib/agentChat.ts');
 const output=[{id:'urn:tag:genre:media:documentary',name:'Documentary'}];
 const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-searchAudienceTags',toolCallId:'tag',state:'output-available',input:{query:'documentary'},output}]});
 const message={id:'m',role:'assistant',text:'Resolved the documentary reference.',createdAt:new Date().toISOString(),blocks};
 assert.deepEqual(chatHistory([message])[0].tools[0].output,output);
});
