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

test('private media streams once and temporary files are removed on success and failure',async()=>{
 const {selectedMedia}=await import('../app/server/selected-media.ts');
 const {readFile}=await import('node:fs/promises');
 const {Readable}=await import('node:stream');
 const client=storage(), originalSend=client.send, originalCredentials=client.config.credentials;
 client.config.credentials=async()=>({accessKeyId:'fixture',secretAccessKey:'fixture'});
 const node={id:'small',name:'Clip.mp4',kind:'file',size:4,content:'cloud-file:fixture'};
 let requests=0,path;
 client.send=async command=>{requests++;assert.equal(command.input.Key,'users/owner/files/fixture');return {ContentLength:4,Body:Readable.from([Buffer.from('clip')])};};
 try{
  const files=selectedMedia('owner',[]);
  await files.withSource(node,async source=>{path=source;assert.equal(await readFile(source,'utf8'),'clip');});
  assert.equal(existsSync(path),false);assert.equal(requests,1);
  await assert.rejects(files.withSource(node,async source=>{path=source;throw new Error('decode failed');}),{message:'decode failed'});
  assert.equal(existsSync(path),false);
  await files.withSource({...node,size:9*1024*1024},async source=>{assert.equal(await readFile(source,'utf8'),'clip');});
  assert.equal(requests,3);
 }finally{client.send=originalSend;client.config.credentials=originalCredentials;}
});

test('video calls allow eight representative samples and reject an invalid request before decoding',async()=>{
 const {mediaUnderstandingTools}=await import('../app/tools/media-understanding.ts');
 const {asSchema}=await import('ai');
 const schema=asSchema(mediaUnderstandingTools('owner',[]).inspectVideo.inputSchema);
 const valid=await schema.validate({fileId:'video',question:'Describe it',samples:5,startSeconds:0});
 const invalid=await schema.validate({fileId:'video',samples:9});
 assert.equal(valid.success,true);assert.equal(invalid.success,false);
 const times=sampleTimes(0,600,5);assert.deepEqual(times,[60,180,300,420,540]);
 assert.ok(times.every(time=>time>0&&time<600));
});

test('video preview cache reuses decoded frames across questions and remains owner/content scoped',async()=>{
 const {videoFrames}=await import('../app/server/video-frames.ts');
 const client=storage(),original=client.send,values=new Map();let decodes=0;
 client.send=async command=>{if(command.constructor.name==='GetObjectCommand'){const value=values.get(command.input.Key);if(value===undefined){const error=new Error('missing');error.name='NoSuchKey';throw error;}return{Body:{transformToString:async()=>value}};}values.set(command.input.Key,command.input.Body);return{};};
 const prepare=async()=>{decodes++;return {duration:600,hasAudio:false,start:0,end:600,frames:[{time:60,image:Buffer.from('frame').toString('base64')}]};};
 try{
  const node={name:'Clip.mp4',content:'cloud-file:one'};
  const first=await videoFrames('one',node,5,0,undefined,prepare);
  const second=await videoFrames('one',node,5,0,undefined,prepare);
  assert.equal(decodes,1);assert.equal(second.frames[0].bytes.toString(),'frame');assert.equal(first.hasAudio,false);
  await videoFrames('two',node,5,0,undefined,prepare);assert.equal(decodes,2);
  await videoFrames('one',{...node,content:'cloud-file:two'},5,0,undefined,prepare);assert.equal(decodes,3);
  client.send=async()=>{throw new Error('Access denied');};
  await assert.rejects(videoFrames('one',node,5,0,undefined,prepare),{message:'Access denied'});assert.equal(decodes,3);
 }finally{client.send=original;}
});

test('video evidence retains full speech and rejects misleading full-coverage flags',async()=>{
 const {videoSampleTimes}=await import('../app/lib/mediaAnalysis.ts');
 const times=videoSampleTimes(0,600,8,'overview');assert.equal(times[0],5);assert.equal(times.length,8);assert.ok(times.at(-1)>550);
 const transcript={model:'google.gemma-4-e2b',duration:130,start:0,end:130,complete:true,uncertainties:[],segments:[{start:120,end:130,text:'Compare energy costs before buying hardware.'}]};
 const video={...analysis,modality:'video',hasAudio:true,transcript};delete video.nextStart;
 assert.equal(mediaAnalysisSchema.safeParse(video).success,true);
 assert.equal(mediaAnalysisSchema.safeParse({...video,transcript:{...transcript,start:30}}).success,false);
 assert.ok(chatHistory([{id:'v',role:'assistant',text:'Technology analysis.',createdAt:'2026-10-18T10:00:00Z',blocks:[{id:'t',kind:'tool',tool:{id:'t',name:'inspectVideo',state:'done',media:video}}]}])[0].content.includes('Compare energy costs'));
});

test('video and audio share one streamed source and cache-only analysis does not download it',async()=>{
 const {withPreparedMedia}=await import('../app/server/prepared-media.ts');
 const {Readable}=await import('node:stream');const {readFile}=await import('node:fs/promises');
 const client=storage(),original=client.send;let downloads=0,path;
 client.send=async()=>{downloads++;return{ContentLength:4,Body:Readable.from([Buffer.from('clip')])};};
 try{
  const node={id:'video',kind:'file',name:'Video.mp4',content:'cloud-file:shared'};
  await withPreparedMedia('owner',node,async source=>{
   const results=await Promise.all([source(async p=>{path=p;return readFile(p,'utf8');}),source(async p=>{assert.equal(p,path);return readFile(p,'utf8');})]);
   assert.deepEqual(results,['clip','clip']);assert.equal(downloads,1);
  });assert.equal(existsSync(path),false);
  await withPreparedMedia('owner',node,async()=>{});assert.equal(downloads,1);
 }finally{client.send=original;}
});

test('a failed source transfer never reaches decoding or produces a successful source',async()=>{
 const {withPreparedMedia}=await import('../app/server/prepared-media.ts');const{Readable}=await import('node:stream');
 const client=storage(),original=client.send;let decoded=false;
 client.send=async()=>({Body:Readable.from((async function*(){yield Buffer.from('partial');throw new Error('Transfer failed');})())});
 try{await assert.rejects(withPreparedMedia('owner',{id:'v',kind:'file',name:'Video.mp4',content:'cloud-file:broken'},source=>source(async()=>{decoded=true;})),{message:'Transfer failed'});assert.equal(decoded,false);}finally{client.send=original;}
});
