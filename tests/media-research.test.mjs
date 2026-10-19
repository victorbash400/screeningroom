import "./helpers/qloo-fetch.mjs";
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

test('performance comparisons preserve recommendation order, exact same-source gaps, ties and incomplete coverage',async()=>{
 const {compareMetrics}=await import('../app/lib/compareMetrics.ts');
 const subjects=[{id:'a',metrics:[{key:'rating',label:'Rating',value:8,unit:'rating10',source:'IMDb'},{key:'votes',label:'Votes',value:10,unit:'count',source:'IMDb'}]},{id:'b',metrics:[{key:'rating',label:'Rating',value:8,unit:'rating10',source:'IMDb'}]},{id:'c',metrics:[{key:'rating',label:'Rating',value:90,unit:'rating100',source:'Metacritic'},{key:'votes',label:'Votes',value:40,unit:'count',source:'IMDb'}]}];
 const result=compareMetrics(subjects);
 assert.equal(result.length,2);assert.deepEqual(result[0].highest,['a','b']);assert.equal(result[0].gap,0);assert.equal(result[0].coverage,2);assert.equal(result[0].total,3);assert.equal(result[1].gap,30);
 await fixture({results:[entities[1],entities[0]]},async()=>{const widget=await mediaEvidence(ids,'Ordered');assert.deepEqual(widget.subjects.map(s=>s.id),ids);assert.ok(widget.metricComparisons.some(m=>m.key==='imdbRating'));});
});

test('comparable discovery accepts genuine tag signals and attaches linked performance evidence in one result',async()=>{
 const {comparableMediaTool}=await import('../app/tools/comparable-media.ts');const previous=globalThis.fetch,server=process.env.QLOO_HACKATHON_API_SERVER_URL,key=process.env.QLOO_HACKATHON_API_KEY;process.env.QLOO_HACKATHON_API_SERVER_URL='https://qloo.invalid';process.env.QLOO_HACKATHON_API_KEY='test';
 const requests=[];globalThis.fetch=async(url)=>{requests.push(url);return Response.json(url.pathname==='/v2/insights'?{success:true,results:{entities:[{...entities[1],query:{affinity:.7}},{...entities[0],query:{affinity:.6}}]}}:{results:entities.map(e=>({...e,properties:{...e.properties,external:{...e.properties.external,imdb:{...e.properties.external.imdb,id:e.name==='Inception'?'tt1375666':'tt0816692'}}}}))});};
 try{let remembered;const tool=comparableMediaTool(v=>{remembered=v;return v;});const output=await tool.execute({type:'movie',entityIds:[],tagIds:['urn:tag:genre:qloo:science_fiction'],take:2,minimumYear:2000,maximumYear:2020},options);assert.equal(requests.length,2);assert.equal(requests[0].searchParams.get('signal.interests.tags'),'urn:tag:genre:qloo:science_fiction');assert.equal(requests[0].searchParams.get('filter.release_year.min'),'2000');assert.equal(output.subjects[0].name,'Interstellar');assert.equal(output.subjects[0].website,'https://www.imdb.com/title/tt0816692/');assert.equal(output.subjects[0].metrics.find(m=>m.key==='affinity').value,.7);assert.equal(output.subjects[0].metrics.find(m=>m.key==='imdbRating').value,8.7);assert.equal(remembered,output);assert.ok(output.metricComparisons.every(metric=>metric.key!=="affinity"));const{performanceOutput}=await import("../app/tools/performance-output.ts");const model=performanceOutput(output);assert.equal(model.value.subjects[0].description,undefined);assert.ok(model.value.interpretation.imdbVotes.includes("not audience size"));
 const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-findComparableMedia',toolCallId:'t',state:'output-available',input:{},output}]});assert.equal(blocks[0].tool.research.subjects[0].website,output.subjects[0].website);assert.ok(chatHistory([{id:'m',role:'assistant',text:'Actual comparables.',createdAt:new Date().toISOString(),blocks}])[0].content.includes('metricComparisons'));
 }finally{globalThis.fetch=previous;if(server===undefined)delete process.env.QLOO_HACKATHON_API_SERVER_URL;else process.env.QLOO_HACKATHON_API_SERVER_URL=server;if(key===undefined)delete process.env.QLOO_HACKATHON_API_KEY;else process.env.QLOO_HACKATHON_API_KEY=key;}
});

test('no comparable matches remains an actionable failure rather than fabricated performance',async()=>{
 const{comparableMediaTool}=await import('../app/tools/comparable-media.ts');await fixture({success:true,results:{entities:[]}},()=>assert.rejects(comparableMediaTool(v=>v).execute({type:'movie',entityIds:[ids[0]],tagIds:[],take:5},options),{message:'Qloo found no comparable media for these references or filters.'}));
});
