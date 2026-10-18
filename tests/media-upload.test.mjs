import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {prepareImport}=await import('../app/lib/importFiles.ts');
const {uploadCloudFile}=await import('../app/lib/cloudFiles.ts');
const {probeMedia}=await import('../app/server/media-processing.ts');
const exec=promisify(execFile);

test('frontend import and signed upload preserve an actual MP4 video and audio byte for byte',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'screeningroom-upload-test-')),originalFetch=globalThis.fetch;
 try{
  const source=join(directory,'source.mp4'),stored=join(directory,'stored.mp4');
  await exec(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=320x180:r=2:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',source]);
  const bytes=await readFile(source);
  globalThis.fetch=async(url,init)=>{
   if(url==='/api/files/upload'){assert.equal(JSON.parse(init.body).size,bytes.length);return Response.json({id:'video-object',url:'https://storage.example/upload'});}
   assert.equal(url,'https://storage.example/upload');assert.equal(init.headers['Content-Type'],'video/mp4');
   await writeFile(stored,Buffer.from(await init.body.arrayBuffer()));return new Response(null,{status:200});
  };
  const nodes=await prepareImport([{kind:'file',file:new File([bytes],'Clip.mp4',{type:'video/mp4'})}],'w',null,file=>uploadCloudFile(file,undefined,false));
  assert.equal(nodes[0].content,'cloud-file:video-object');assert.equal(nodes[0].versions[0].content,nodes[0].content);
  assert.equal(createHash('sha256').update(await readFile(stored)).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
  const media=await probeMedia(stored,'mov');assert.equal(media.audioTracks,1);assert.equal(media.videoTracks,1);
 }finally{globalThis.fetch=originalFetch;await rm(directory,{recursive:true,force:true});}
});
