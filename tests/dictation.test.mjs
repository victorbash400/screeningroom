import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
const stub='data:text/javascript,'+encodeURIComponent('export async function transcribeClip(bytes){ globalThis.dictationCalls=(globalThis.dictationCalls??0)+1; return {transcript:"A recorded message.",uncertainties:[]}; }');
registerHooks({resolve(s,c,n){if(c.parentURL?.endsWith('/server/dictation.ts')&&s==='./media-model')return n(stub,c);if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {recordingFormat,recordingBytes,transcribeRecording,recordingLimit}=await import('../app/server/dictation.ts');

test('recording uploads accept supported MIME types and reject oversized, empty and unsupported content',async()=>{
 assert.equal(recordingFormat('audio/webm;codecs=opus'),'matroska');assert.equal(recordingFormat('audio/mp4'),'mov');
 assert.throws(()=>recordingFormat('video/webm'));assert.throws(()=>recordingFormat('text/html'));
 await assert.rejects(recordingBytes(new Request('https://example.com',{method:'POST',body:new Uint8Array()})),{message:'Recording is empty.'});
 await assert.rejects(recordingBytes(new Request('https://example.com',{method:'POST',body:new Uint8Array(recordingLimit+1)})),{message:'Recording exceeds 4 MB. Record a shorter message.'});
 const bytes=await recordingBytes(new Request('https://example.com',{method:'POST',body:new Uint8Array([1,2,3])}));assert.deepEqual([...bytes],[1,2,3]);
});

test('temporary dictation decodes browser audio, skips silence, rejects excessive duration and cleans up after errors',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'screeningroom-voice-fixture-'));
 const before=(await readdir(tmpdir())).filter(name=>name.startsWith('screeningroom-dictation-'));
 try{
  const voice=join(folder,'voice.webm'),silence=join(folder,'silence.wav'),long=join(folder,'long.wav');
  execFileSync(ffmpeg,['-v','error','-f','lavfi','-i','sine=frequency=440:duration=1','-c:a','libopus',voice]);
  assert.equal(await transcribeRecording(await readFile(voice),'matroska'),'A recorded message.');
  assert.equal(globalThis.dictationCalls,1);
  const streamed=execFileSync(ffmpeg,['-v','error','-f','lavfi','-i','sine=frequency=440:duration=1','-c:a','libopus','-f','webm','pipe:1']);
  assert.equal(await transcribeRecording(streamed,'matroska'),'A recorded message.');
  assert.equal(globalThis.dictationCalls,2);
  execFileSync(ffmpeg,['-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','1',silence]);
  await assert.rejects(transcribeRecording(await readFile(silence),'wav'),{message:'No words detected. Record again.'});assert.equal(globalThis.dictationCalls,2);
  execFileSync(ffmpeg,['-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','181',long]);
  await assert.rejects(transcribeRecording(await readFile(long),'wav'),{message:'Recording exceeds 3 minutes. Record a shorter message.'});
  await assert.rejects(transcribeRecording(new Uint8Array([1,2,3]),'wav'));
  assert.deepEqual((await readdir(tmpdir())).filter(name=>name.startsWith('screeningroom-dictation-')),before);
 }finally{await rm(folder,{recursive:true,force:true});}
});
