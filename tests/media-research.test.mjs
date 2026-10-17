import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/server')return next('next/server.js',context);
 if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){const file=new URL(specifier+'.ts',context.parentURL);if(existsSync(file))return next(file.href,context);}
 return next(specifier,context);
}});
const {mediaEvidence} = await import('../app/server/media-evidence.ts');
const {evidenceCharts} = await import('../app/tools/evidence-charts.ts');
const {compareAudienceSignals} = await import('../app/tools/compare-audience.ts');
const {agentBlocks} = await import('../app/lib/agentActivity.ts');
const {chatHistory} = await import('../app/lib/agentChat.ts');
const {parseData} = await import('../app/lib/storage.ts');

const ids=['18B098FD-3D84-4609-BFF3-ADF9A0B00E40','057DA9D9-399B-437E-8BCA-A80E499125EF'];
const options={toolCallId:'test',messages:[]};
const entities=ids.map((entity_id,index)=>({entity_id,name:index?'Interstellar':'Inception',popularity:index?.9:.8,tags:[{tag_id:'genre',name:'Sci-Fi'}],properties:{release_year:index?2014:2010,external:{imdb:{user_rating:index?8.7:8.8,user_rating_count:1000},metacritic:null}}}));
async function fixture(response,run){
 const previous=globalThis.fetch; const server=process.env.QLOO_HACKATHON_API_SERVER_URL,key=process.env.QLOO_HACKATHON_API_KEY;
 process.env.QLOO_HACKATHON_API_SERVER_URL='https://qloo.invalid';process.env.QLOO_HACKATHON_API_KEY='test';
 globalThis.fetch=async (url,init)=>{assert.equal(init.headers['X-Api-Key'],'test');assert.equal(new URL(url).searchParams.has('api_key'),false);return Response.json(response);};
 try{return await run();}finally{globalThis.fetch=previous;if(server===undefined)delete process.env.QLOO_HACKATHON_API_SERVER_URL;else process.env.QLOO_HACKATHON_API_SERVER_URL=server;if(key===undefined)delete process.env.QLOO_HACKATHON_API_KEY;else process.env.QLOO_HACKATHON_API_KEY=key;}
}
test('catalogue comparison retains sources/scales, shares actual tags, and keeps missing metrics absent',async()=>{
 await fixture({results:entities},async()=>{
 const widget=await mediaEvidence(ids,'Comparison');
 assert.deepEqual(widget.commonTags,['Sci-Fi']);
 assert.equal(widget.subjects[0].metrics.find(m=>m.key==='imdbRating').unit,'rating10');
 assert.equal(widget.subjects[0].metrics.some(m=>m.key==='metacriticRating'),false);
 const charts=evidenceCharts();charts.remember(widget);
 const chart=await charts.renderEvidenceChart.execute({evidenceId:widget.evidenceId,metric:'imdbRating',view:'bar'},options);
 assert.deepEqual(chart.series[0].points.map(p=>p.value),[8.8,8.7]);
 await assert.rejects(charts.renderEvidenceChart.execute({evidenceId:widget.evidenceId,metric:'inventedRevenue',view:'bar'},options));
 await assert.rejects(charts.renderEvidenceChart.execute({evidenceId:'invented',metric:'popularity',view:'bar'},options));
 const restored=evidenceCharts(async id=>id===widget.evidenceId?widget:undefined);
 assert.equal((await restored.renderEvidenceChart.execute({evidenceId:widget.evidenceId,metric:'popularity',view:'line'},options)).series[0].points.length,2);
 });
});
test('missing entities and invalid provider numbers fail visibly',async()=>{
 await fixture({results:[]},()=>assert.rejects(mediaEvidence(ids,'Missing')));
 await fixture({results:[{...entities[0],popularity:'many'}]},()=>assert.rejects(mediaEvidence([ids[0]],'Invalid')));
});
test('comparison charts come from real returned comparison tags, never overlap percentages',async()=>{
 await fixture({results:{tags:[{name:'Sci-Fi',query:{score:.73}}]}},async()=>{
 const chart=await compareAudienceSignals.execute({title:'Shared tastes',first:[ids[0]],second:[ids[1]]},options);
 assert.equal(chart.unit,'index');assert.equal(chart.series[0].points[0].value,.73);
 assert.ok(chart.basis.includes('not shared-viewer percentages'));
 });
});
test('research widgets survive streaming, backend storage, and grounded follow-up context in the fit workflow',async()=>{
 await fixture({results:entities},async()=>{
 const output=await mediaEvidence(ids,'Comparison');
 const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-compareMedia',toolCallId:'t',state:'output-available',input:{entityIds:ids},output},{type:'text',text:'The evidence supports a narrower test.'}]});
 const message={id:'m',role:'assistant',text:'The evidence supports a narrower test.',createdAt:new Date().toISOString(),blocks};
 const data={version:1,workspaces:[{id:'w',name:'Workspace'}],nodes:[],conversations:[{id:'c',workspaceId:'w',channel:'fit',title:'Audience fit',draft:'',messages:[message]}]};
 assert.equal(parseData(JSON.stringify(data)).conversations[0].messages[0].blocks[0].tool.research.kind,'comparison');
 assert.ok(chatHistory([message])[0].content.includes('IMDb via Qloo'));
 });
});

test('selected-file tools enforce owner and selection scope and calculate from backend contents',async()=>{
 const {mock}=await import('node:test');
 const {database,storage}=await import('../app/server/aws.ts');
 const {mediaResearchTools}=await import('../app/tools/media-research.ts');
 const names=['AWS_REGION','DYNAMODB_TABLE_NAME','S3_BUCKET_NAME'];
 const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 process.env.AWS_REGION='us-east-1';process.env.DYNAMODB_TABLE_NAME='fixture';process.env.S3_BUCKET_NAME='fixture';
 const roomFile='00000000-0000-4000-8000-000000000011', csvFile='00000000-0000-4000-8000-000000000012';
 const node={id:'selected',workspaceId:'w',parentId:'folder',name:'Results.csv',kind:'file',updatedAt:new Date().toISOString(),mimeType:'text/csv',content:`cloud-file:${csvFile}`};
 const data={version:1,workspaces:[{id:'w',name:'Workspace'}],conversations:[],nodes:[{id:'folder',workspaceId:'w',parentId:null,name:'Project',kind:'folder',updatedAt:new Date().toISOString()},node,{...node,id:'unselected',parentId:null,name:'Private.csv'}]};
 let recordReads=0,contentReads=0;
 const db=mock.method(database(),'send',async command=>{recordReads++;assert.equal(command.input.Key.pk,'USER#owner');return {Item:{version:1,value:{fileId:roomFile,imports:[],mutationId:'m'}}};});
 const s3=mock.method(storage(),'send',async command=>{assert.ok(command.input.Key.startsWith('users/owner/files/'));const snapshot=command.input.Key.endsWith(roomFile);if(!snapshot)contentReads++;return {Body:{transformToString:async()=>snapshot?JSON.stringify(data):'campaign,impressions,clicks\nA,100,10\nB,200,20'}};});
 try{
  const tools=mediaResearchTools('owner',['folder']);
  const selected=await tools.readSelectedMedia.execute({},options);
  assert.deepEqual(selected.files.map(file=>file.id),['folder','selected']);
  await assert.rejects(tools.readSelectedMedia.execute({fileId:'unselected'},options));
  const measured=await tools.analyzeProjectPerformance.execute({fileId:'selected',columns:{impressions:'impressions',clicks:'clicks'},groupBy:'campaign'},options);
  assert.equal(measured.subjects[0].metrics.find(metric=>metric.key==='ctr').value,10);
  const chart=await tools.renderEvidenceChart.execute({evidenceId:measured.evidenceId,metric:'ctr',view:'bar'},options);
  assert.deepEqual(chart.series[0].points.map(point=>point.value),[10,10]);
  assert.equal(recordReads,1);assert.equal(contentReads,1);
 }finally{db.mock.restore();s3.mock.restore();for(const name of names)if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
});
