import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import ffmpeg from 'ffmpeg-static';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {imageFrame,audioClip,probeMedia,mediaInputFormat}=await import('../app/server/media-processing.ts');
const exec=promisify(execFile);

test('bundled media decoding handles a video with speech-sized audio, sparse frames and explicit malformed inputs',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'screeningroom-decoding-test-'));
 try{
  const video=join(directory,'clip.mp4');
  await exec(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=640x360:r=10:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',video]);
  const metadata=await probeMedia(video,'mov');assert.equal(metadata.hasAudio,true);assert.equal(metadata.hasVideo,true);assert.ok(metadata.duration>=2);
  const image=await imageFrame(video,1,'mov');assert.equal(image[0],255);assert.equal(image[1],216);
  const audio=await audioClip(video,0,1,'mov');assert.equal(audio.subarray(0,4).toString(),'RIFF');assert.ok(audio.length>32000);
  const corrupt=join(directory,'corrupt.mp4');await writeFile(corrupt,'not a video');
  await assert.rejects(probeMedia(corrupt,'mov'),{message:'Media could not be decoded. Check its format or upload a converted copy.'});
  assert.throws(()=>mediaInputFormat({kind:'file',name:'playlist.m3u8',mimeType:'video/unknown'}));
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('full audio decodes once and produces exact model-sized WAV windows beyond two minutes',async()=>{
 const {withDecodedAudio}=await import('../app/server/decoded-audio.ts');
 const directory=await mkdtemp(join(tmpdir(),'screeningroom-audio-test-'));
 try{
  const audio=join(directory,'long.wav');
  await exec(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:duration=125','-ar','16000','-ac','1',audio]);
  await withDecodedAudio(audio,0,125,'wav',async decoded=>{
   assert.equal(decoded.windows.length,5);
   assert.deepEqual(decoded.windows.at(-1),{start:120,end:125});
   const first=await decoded.read(0),last=await decoded.read(4);
   assert.equal(first.length,960044);assert.equal(first.readUInt32LE(40),960000);
   assert.equal(last.length,160044);assert.equal(last.readUInt32LE(40),160000);
   assert.equal(last.readUInt32LE(24),16000);assert.equal(last.readUInt16LE(22),1);
   await assert.rejects(decoded.read(5),{message:'Audio chunk is unavailable.'});
  });
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('digital silence is skipped without removing quiet speech or other nonzero audio',async()=>{
 const {hasAudioSignal}=await import('../app/server/decoded-audio.ts');
 const wav=Buffer.alloc(44+32000);wav.write('RIFF',0);
 assert.equal(hasAudioSignal(wav),false);
 wav.writeInt16LE(1,44);assert.equal(hasAudioSignal(wav),true);
 wav.writeInt16LE(-1,44);assert.equal(hasAudioSignal(wav),true);
});
