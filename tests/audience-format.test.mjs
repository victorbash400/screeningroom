import "./helpers/qloo-fetch.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);},load(url,c,n){if(url.endsWith('/app/server/bedrock.ts'))return{format:'module',source:'export const bedrockFetch=fetch; export async function bedrockHeaders(){return {}}; export async function chatModel(){return {specificationVersion:"v3",provider:"test",modelId:"test"}}',shortCircuit:true};return n(url,c);}});
const { createAgent } = await import('../app/agents/index.ts');
const { digitalPlatformFitTool } = await import('../app/tools/digital-platforms.ts');
const { parseData, emptyData } = await import('../app/lib/storage.ts');
const { agentBlocks } = await import('../app/lib/agentActivity.ts');
const options = { toolCallId: 't', messages: [] };

test('audience must establish its work before research, and Digital cannot search physical venues', async () => {
  const digital = await createAgent('locations', undefined, 'test-user', [], 'digital');
  for (const name of ['searchAudienceVenues','searchMapVenues','getAreaPopulation']) assert.equal(name in digital.tools, false);
  assert.ok('getDigitalPlatformFit' in digital.tools);
  assert.ok('analyzeDigitalAudience' in digital.tools);
  assert.ok('analyzeProjectPerformance' in digital.tools);
  assert.ok('findComparableMedia' in digital.tools);
  const initial = digital.settings.prepareStep({ steps: [] });
  assert.ok(initial.activeTools.includes('establishAudienceWork'));
  assert.equal(initial.activeTools.includes('getDigitalPlatformFit'), false);
  assert.equal(initial.activeTools.includes('searchEntities'), false);
  await digital.tools.establishAudienceWork.execute({medium:'Film',summary:'A documentary about space',characteristics:['Science education'],basis:'user description'}, options);
  assert.equal(digital.settings.prepareStep({ steps: [] }), undefined);
  const followup = await createAgent('locations', undefined, 'test-user', [], 'digital', true);
  assert.equal(followup.settings.prepareStep({ steps: [] }), undefined);
  const live = await createAgent('locations', undefined, 'test-user', [], 'live');
  assert.ok('searchAudienceVenues' in live.tools);
  assert.equal('getDigitalPlatformFit' in live.tools, false);
});

test('a completed venue search can finish without a forced extra heatmap call', async () => {
  const live = await createAgent('locations', undefined, 'test-user', [], 'live', true);
  const steps = [{ toolCalls: [{ toolCallId: 'venues', toolName: 'searchAudienceVenues', input: { entityIds: ['reference'], tagIds: [] } }], toolResults: [{ toolCallId: 'venues' }] }];
  assert.equal(live.settings.prepareStep({ steps }), undefined);
  assert.ok('getAudienceHeatmap' in live.tools);
});

test('audience format survives backend room validation; invalid format fails', () => {
  const data={...emptyData,workspaces:[{id:'w',name:'Work'}],conversations:[{id:'c',workspaceId:'w',channel:'locations',title:'Audience',messages:[],draft:'',audienceMode:'digital'}]};
  assert.equal(parseData(JSON.stringify(data)).conversations[0].audienceMode,'digital');
  data.conversations[0].audienceMode='invalid';
  assert.throws(()=>parseData(JSON.stringify(data)),{message:"Saved conversation data is invalid."});
});

test('digital fit uses selected brands, retains their links and flags partial coverage instead of inventing scores', async () => {
  const original = globalThis.fetch;
  const envKeys=['QLOO_HACKATHON_API_SERVER_URL','QLOO_HACKATHON_API_KEY'];
  const previous=envKeys.map(key=>process.env[key]);
  process.env[envKeys[0]]='https://qloo.invalid'; process.env[envKeys[1]]='test';
  const platformId='866e0085-3c8e-4780-ba28-b837cafc3d6b';
  let request;
  globalThis.fetch=async url=>{
    if(url.pathname==='/search')return Response.json({results:url.searchParams.get('query')==='Hulu'?[{entity_id:platformId,name:'Hulu',types:['urn:entity:brand']}]:[]});
    request=url;
    return Response.json({success:true,results:{entities:[{entity_id:platformId,name:'Hulu',subtype:'urn:entity:brand',query:{affinity:.807}}]}});
  };
  try{
    const tool=digitalPlatformFitTool(value=>value);
    const output=await tool.execute({title:'Digital fit',platformIds:['hulu','kindle'],entityIds:['057da9d9-399b-437e-8bca-a80e499125ef'],tagIds:[]},options);
    assert.equal(request.searchParams.get('filter.type'),'urn:entity:brand');
    assert.equal(request.searchParams.get('filter.results.entities'),platformId);
    assert.equal(request.searchParams.has('filter.location'),false);
    assert.equal(output.subjects[0].website,'https://www.hulu.com');
    assert.equal(output.subjects[0].metrics[0].value,.807);
    assert.equal(output.subjects[1].name,'Kindle');
    assert.deepEqual(output.subjects[1].metrics,[]);
    assert.ok(output.basis.includes('No Qloo affinity coverage for: Kindle'));
    assert.equal(agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-getDigitalPlatformFit',toolCallId:'t',state:'output-available',input:{},output}]} )[0].tool.research.subjectLabel,'Platform');
  }finally{globalThis.fetch=original;envKeys.forEach((key,index)=>previous[index]===undefined?delete process.env[key]:process.env[key]=previous[index]);}
});
