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
