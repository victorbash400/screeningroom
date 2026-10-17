import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {mediaKind,sampleTimes,audioWindows,mediaAnalysisSchema}=await import('../app/lib/mediaAnalysis.ts');
const {agentBlocks}=await import('../app/lib/agentActivity.ts');
const {parseData}=await import('../app/lib/storage.ts');
const {chatHistory}=await import('../app/lib/agentChat.ts');
const {cachedMediaAnalysis}=await import('../app/server/media-analysis-cache.ts');
const {storage}=await import('../app/server/aws.ts');

test('media detection, evenly spaced frames and model-sized audio chunks keep exact coverage',()=>{
 assert.equal(mediaKind({kind:'file',name:'Movie.MP4'}),'video');
 assert.equal(mediaKind({kind:'folder',name:'movie.mp4'}),undefined);
 assert.deepEqual(sampleTimes(10,30,4),[12.5,17.5,22.5,27.5]);
 assert.deepEqual(audioWindows(5,76),[{start:5,end:35},{start:35,end:65},{start:65,end:76}]);
 assert.throws(()=>sampleTimes(30,10,4));assert.throws(()=>sampleTimes(0,10,0));
});
const analysis={kind:'media',fileId:'asset',name:'Speech.wav',modality:'audio',model:'google.gemma-4-e2b',summary:'',visibleText:'',uncertainties:[],duration:140,start:0,end:120,nextStart:120,segments:[{start:0,end:30,text:'The screening starts at seven.'}]};
test('media evidence persists in stream order and is available for grounded follow-up messages',()=>{
 const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-transcribeMedia',toolCallId:'t',state:'output-available',input:{fileId:'asset'},output:analysis},{type:'text',text:'The clip mentions the start time.'}]});
 const message={id:'m',role:'assistant',text:'The clip mentions the start time.',createdAt:new Date().toISOString(),blocks};
 const data={version:1,workspaces:[{id:'w',name:'Workspace'}],nodes:[],conversations:[{id:'c',workspaceId:'w',channel:'similar',title:'Media',draft:'',messages:[message]}]};
 assert.equal(parseData(JSON.stringify(data)).conversations[0].messages[0].blocks[0].tool.media.nextStart,120);
 assert.ok(chatHistory([message])[0].content.includes('The screening starts at seven.'));
 assert.equal(mediaAnalysisSchema.safeParse({...analysis,segments:[{start:-2,text:'invalid'}]}).success,false);
});
test('analysis cache is owner/content/model scoped and does not hide storage or malformed-result failures',async()=>{
 process.env.AWS_REGION='us-east-1';process.env.S3_BUCKET_NAME='test';
 const client=storage(), original=client.send;const values=new Map();let count=0;
 client.send=async command=>{
  if(command.constructor.name==='GetObjectCommand'){
   const value=values.get(command.input.Key);if(!value){const e=new Error('missing');e.name='NoSuchKey';throw e;}return {Body:{transformToString:async()=>value}};
  }
  values.set(command.input.Key,command.input.Body);return {};
 };
 try{
  const run=async()=>{count++;return analysis;};
  await cachedMediaAnalysis('owner',{content:'one',model:'gemma'},run);
  await cachedMediaAnalysis('owner',{content:'one',model:'gemma'},run);assert.equal(count,1);
  await cachedMediaAnalysis('other',{content:'one',model:'gemma'},run);assert.equal(count,2);
  await cachedMediaAnalysis('owner',{content:'two',model:'gemma'},run);assert.equal(count,3);
  client.send=async()=>{throw new Error('Access denied');};
  await assert.rejects(cachedMediaAnalysis('owner',{},run));assert.equal(count,3);
 }finally{client.send=original;}
});

test('small private media is prepared once and temporary files are removed on success and failure',async()=>{
 const {selectedMedia}=await import('../app/server/selected-media.ts');
 const {readFile}=await import('node:fs/promises');
 const client=storage(), originalSend=client.send, originalCredentials=client.config.credentials;
 client.config.credentials=async()=>({accessKeyId:'fixture',secretAccessKey:'fixture'});
 const node={id:'small',name:'Clip.mp4',kind:'file',size:4,content:'cloud-file:fixture'};
 let requests=0,path;
 client.send=async command=>{requests++;assert.equal(command.input.Key,'users/owner/files/fixture');return {ContentLength:4,Body:{transformToByteArray:async()=>Buffer.from('clip')}};};
 try{
  const files=selectedMedia('owner',[]);
  await files.withSource(node,async source=>{path=source;assert.equal(await readFile(source,'utf8'),'clip');});
  assert.equal(existsSync(path),false);assert.equal(requests,1);
  await assert.rejects(files.withSource(node,async source=>{path=source;throw new Error('decode failed');}),{message:'decode failed'});
  assert.equal(existsSync(path),false);
  await files.withSource({...node,size:9*1024*1024},async source=>{assert.ok(source.startsWith('https:'));});
  assert.equal(requests,2);
 }finally{client.send=originalSend;client.config.credentials=originalCredentials;}
});
