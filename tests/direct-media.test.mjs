import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {publicAddress,publicMediaUrl,withPublicMedia}=await import('../app/server/public-media.ts');
const {mediaInputFormat}=await import('../app/server/media-processing.ts');
const {mediaKind}=await import('../app/lib/mediaAnalysis.ts');
const {linkedMediaTools}=await import('../app/tools/linked-media.ts');
const {mediaUnderstandingTools}=await import('../app/tools/media-understanding.ts');
const {asSchema}=await import('ai');
const {agentBlocks}=await import('../app/lib/agentActivity.ts');
const {chatHistory}=await import('../app/lib/agentChat.ts');

test('public link fetching rejects local networks, credentials, unsafe protocols and private IPv6',async()=>{
 for(const address of ['127.0.0.1','10.1.1.1','169.254.169.254','172.16.2.1','192.168.1.1','100.64.0.1','0.0.0.0','::1','fe80::1','fc00::1','::ffff:127.0.0.1'])assert.equal(publicAddress(address),false,address);
 for(const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])assert.equal(publicAddress(address),true,address);
 for(const url of ['file:///video.mp4','http://example.com/video.mp4','https://user:password@example.com/video.mp4','https://example.com:8080/video.mp4'])assert.throws(()=>publicMediaUrl(url));
 await assert.rejects(withPublicMedia('https://127.0.0.1/video.mp4','GET',async()=>assert.fail('private host fetched')),{message:'Use a public media host.'});
});
test('friendly imported link names retain direct media types and choose the correct decoder',()=>{
 const audio={kind:'file',name:'Audio',sourceUrl:'https://example.com/a/speech.mp3?token=sample'};
 const video={kind:'file',name:'Video',sourceUrl:'https://example.com/clip.webm'};
 assert.equal(mediaKind(audio),'audio');assert.equal(mediaInputFormat(audio),'mp3');
 assert.equal(mediaKind(video),'video');assert.equal(mediaInputFormat(video),'matroska');
 assert.equal(mediaInputFormat({...audio,sourceUrl:'https://example.com/download',mimeType:'audio/mpeg'}),'mp3');
});
test('uploaded and linked video default to ten frames; direct audio has a dedicated tool and persistent output',async()=>{
 const upload=await asSchema(mediaUnderstandingTools('owner',[]).inspectVideo.inputSchema).validate({fileId:'video'});
 const link=await asSchema(linkedMediaTools('owner').inspectLinkedVideo.inputSchema).validate({url:'https://example.com/clip.mp4'});
 assert.equal(upload.value.samples,10);assert.equal(link.value.samples,10);
 const output={kind:'media',fileId:'audio',name:'Speech.mp3',modality:'audio',model:'test',sourceUrl:'https://example.com/speech.mp3',summary:'',visibleText:'',uncertainties:[],segments:[{start:0,end:1,text:'Hello'}]};
 const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-transcribeLinkedMedia',toolCallId:'t',state:'output-available',input:{url:output.sourceUrl},output}]});
 assert.equal(blocks[0].tool.media.sourceUrl,output.sourceUrl);
 assert.ok(linkedMediaTools('owner').transcribeLinkedMedia);
});

test('transcription trims exact trailing PCM silence while retaining quiet samples and valid WAV lengths',async()=>{
 const {trimDigitalSilence,hasAudioSignal}=await import('../app/server/decoded-audio.ts');
 const wav=Buffer.alloc(64);wav.write('RIFF');wav.writeUInt32LE(56,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.write('data',36);wav.writeUInt32LE(20,40);
 wav.writeInt16LE(1,48);
 const trimmed=trimDigitalSilence(wav);
 assert.equal(trimmed.length,50);assert.equal(trimmed.readInt16LE(48),1);
 assert.equal(trimmed.readUInt32LE(4),42);assert.equal(trimmed.readUInt32LE(40),6);
 assert.equal(hasAudioSignal(trimmed),true);
 const silent=Buffer.alloc(64);assert.equal(trimDigitalSilence(silent),silent);assert.equal(hasAudioSignal(silent),false);
});

test('partial video results retain observed frames and expose an audio failure instead of a successful tool state',()=>{
 const output={kind:'media',fileId:'video',name:'Video.mp4',modality:'video',model:'test',summary:'A visible flower.',visibleText:'',uncertainties:[],hasAudio:true,transcriptError:'Audio transcription failed. Try again.',segments:[{start:0,text:'An orange flower.'}]};
 const blocks=agentBlocks({id:'m',role:'assistant',parts:[{type:'tool-inspectLinkedVideo',toolCallId:'partial',state:'output-available',input:{},output}]});
 assert.equal(blocks[0].tool.state,'failed');
 assert.equal(blocks[0].tool.error,output.transcriptError);
 assert.equal(blocks[0].tool.media.summary,output.summary);
 assert.equal(blocks[0].tool.media.transcript,undefined);
 const history=chatHistory([{id:'m',role:'assistant',text:'The visual result is available; audio failed.',createdAt:new Date().toISOString(),blocks}]);
 assert.equal(history[0].tools[0].output.transcriptError,output.transcriptError);
});

test('partial video analysis is not cached as a successful complete analysis',async()=>{
 const {cachedMediaAnalysis}=await import('../app/server/media-analysis-cache.ts');
 const {storage}=await import('../app/server/aws.ts');
 process.env.AWS_REGION='us-east-1';process.env.S3_BUCKET_NAME='fixture';
 const client=storage(),original=client.send;let writes=0,runs=0;
 client.send=async command=>{if(command.constructor.name==='GetObjectCommand'){const error=new Error('missing');error.name='NoSuchKey';throw error;}writes++;return{};};
 try{
  const run=async()=>{runs++;return{kind:'media',fileId:'v',name:'Video.mp4',modality:'video',model:'test',summary:'A visible flower.',visibleText:'',uncertainties:[],segments:[],transcriptError:'Audio transcription failed. Try again.'};};
  await cachedMediaAnalysis('owner',{source:'video'},run);await cachedMediaAnalysis('owner',{source:'video'},run);
  assert.equal(runs,2);assert.equal(writes,0);
 }finally{client.send=original;}
});
