import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {analyzeYoutube}=await import('../app/server/youtube-analysis.ts');
const {youtubeNode}=await import('../app/server/youtube-media.ts');
const {storage}=await import('../app/server/aws.ts');
const {mediaUnderstandingTools}=await import('../app/tools/media-understanding.ts');
process.env.AWS_REGION='us-east-1';process.env.S3_BUCKET_NAME='fixture';process.env.GEMINI_API_KEY='fixture-key';
const fixture=()=>({title:'Public film',duration:20,coverageEnd:20,summary:'A person stands by an elephant enclosure.',visibleText:'',uncertainties:[],observations:[{start:1,text:'A person faces the camera.'}],speechStatus:'transcribed',speech:[{start:1,end:3,text:'Hello there.'}],speechUncertainties:[]});

test('native YouTube bypasses local metadata extraction, sends the URL and keeps speech and observations',async()=>{
 const original=globalThis.fetch,client=storage(),send=client.send;let request,writes=0;
 client.send=async command=>{if(command.constructor.name==='GetObjectCommand'){const e=new Error('missing');e.name='NoSuchKey';throw e;}writes++;return{};};
 globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent');request=JSON.parse(init.body);return Response.json({candidates:[{content:{role:'model',parts:[{text:JSON.stringify(fixture())}]},finishReason:'STOP'}]});};
 try{
  const node=await youtubeNode('https://youtu.be/jNQXAC9IVRw');
  const output=await analyzeYoutube('owner',node,{question:'Analyze this',modality:'video',includeAudio:true,startSeconds:0});
  assert.equal(request.contents[0].parts[0].fileData.fileUri,'https://www.youtube.com/watch?v=jNQXAC9IVRw');
  assert.equal(request.generationConfig.responseMimeType,'application/json');
  assert.equal(request.background,undefined);assert.equal(output.analysisMethod,'native-video');
  assert.equal(output.transcript.segments[0].text,'Hello there.');assert.equal(output.transcript.complete,true);assert.equal(writes,1);
  const tools=mediaUnderstandingTools('owner',[],{node:async()=>({...node,id:'imported-link'} )});
  const selected=await tools.inspectVideo.execute({fileId:'imported-link',question:'Analyze',samples:10,sampling:'overview',includeAudio:true,startSeconds:0},{toolCallId:'selected',messages:[]});
  assert.equal(selected.analysisMethod,'native-video');assert.equal(selected.fileId,'imported-link');
  const audio=await tools.transcribeMedia.execute({fileId:'imported-link',startSeconds:0},{toolCallId:'audio',messages:[]});
  assert.equal(audio.modality,'audio');assert.equal(audio.segments[0].text,'Hello there.');
  assert.equal(audio.sourceUrl,'https://www.youtube.com/watch?v=jNQXAC9IVRw');
 }finally{globalThis.fetch=original;client.send=send;}
});

test('native results reject invalid timestamps and expose free-tier limits without a downloader fallback',async()=>{
 const original=globalThis.fetch,client=storage(),send=client.send;let calls=0;
 client.send=async command=>{if(command.constructor.name==='GetObjectCommand'){const e=new Error('missing');e.name='NoSuchKey';throw e;}assert.fail('invalid analysis cached');};
 const node=await youtubeNode('https://youtu.be/jNQXAC9IVRw');const options={question:'Analyze',modality:'video',includeAudio:true,startSeconds:0};
 try{
  globalThis.fetch=async()=>{calls++;return Response.json({error:{code:429,message:'quota',status:'RESOURCE_EXHAUSTED'}},{status:429});};
  await assert.rejects(analyzeYoutube('owner',node,options),{message:'Gemini free-tier limit reached. Try later or upload the video.'});assert.equal(calls,1);
  globalThis.fetch=async()=>Response.json({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({...fixture(),observations:[{start:25,text:'Outside video'}]})}]},finishReason:'STOP'}]});
  await assert.rejects(analyzeYoutube('owner',node,options),{message:'Gemini returned invalid video timestamps. Try again or upload the video.'});
 }finally{globalThis.fetch=original;client.send=send;}
});
