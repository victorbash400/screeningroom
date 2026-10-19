import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
registerHooks({ resolve(s,c,n) { if(s==='next/server') return n('next/server.js',c); if(s.startsWith('.')&&c.parentURL?.startsWith('file:')) {const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c); } });
const { youtubeUrl, youtubeMetadata, withYoutubeMedia } = await import('../app/server/youtube-media.ts');
const { withPreparedMedia } = await import('../app/server/prepared-media.ts');
const { mediaKind } = await import('../app/lib/mediaAnalysis.ts');
const url='https://youtu.be/jNQXAC9IVRw';

test('only validated YouTube identifiers reach the downloader, with tracking and playlists removed',()=>{
 assert.deepEqual(youtubeUrl(url+'?list=playlist&extra=something'),{id:'jNQXAC9IVRw',url:'https://www.youtube.com/watch?v=jNQXAC9IVRw'});
 assert.equal(youtubeUrl('https://www.youtube.com/shorts/jNQXAC9IVRw').id,'jNQXAC9IVRw');
 for(const invalid of ['http://localhost/video','file:///tmp/video.mp4','https://youtube.com.attacker.test/watch?v=jNQXAC9IVRw','https://youtube.com/watch?v=bad','https://user:password@youtube.com/watch?v=jNQXAC9IVRw'])assert.throws(()=>youtubeUrl(invalid));
 assert.equal(mediaKind({kind:'file',name:'A linked video',sourceUrl:url}),'video');
 assert.equal(mediaKind({kind:'file',name:'An ordinary link',sourceUrl:'https://example.com'}),undefined);
});

test('linked media prepares once, retains a full stream for audio and visuals, cleans up and fails explicitly',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'screeningroom-linked-fixture-'));
 const executable=join(directory,'downloader'),calls=join(directory,'calls.jsonl');
 const previous={YTDLP_PATH:process.env.YTDLP_PATH,YOUTUBE_TEST_CALLS:process.env.YOUTUBE_TEST_CALLS,YOUTUBE_TEST_MODE:process.env.YOUTUBE_TEST_MODE};
 await writeFile(executable,`#!/usr/bin/env node
import { appendFile, writeFile } from 'node:fs/promises';
const args=process.argv.slice(2);await appendFile(process.env.YOUTUBE_TEST_CALLS,JSON.stringify(args)+'\\n');
if(process.env.YOUTUBE_TEST_MODE==='fail'){process.exitCode=1;}else if(args.includes('--dump-single-json')){
 const id=new URL(args.at(-1)).searchParams.get('v');
 console.log(JSON.stringify({id:process.env.YOUTUBE_TEST_MODE==='wrong'?'aaaaaaaaaaa':id,title:'Linked work',duration:19,channel:'Publisher',webpage_url:args.at(-1)}));
}else{await writeFile(args[args.indexOf('--output')+1],'combined audio and video');}
`);
 await chmod(executable,0o755);process.env.YTDLP_PATH=executable;process.env.YOUTUBE_TEST_CALLS=calls;
 try{
  const info=await youtubeMetadata(url);assert.equal(info.title,'Linked work');
  await youtubeMetadata(url);
  let path;
  await withPreparedMedia('owner',{kind:'file',name:'Linked',sourceUrl:url},async withSource=>{
   const values=await Promise.all([withSource(async source=>{path=source;return readFile(source,'utf8');}),withSource(source=>readFile(source,'utf8'))]);
   assert.deepEqual(values,['combined audio and video','combined audio and video']);
  });
  assert.equal(existsSync(path),false);
  const logged=(await readFile(calls,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(logged.length,2);assert.ok(logged[1].includes('--merge-output-format'));assert.ok(logged[1].includes('mp4'));assert.ok(logged[1].includes('--ffmpeg-location'));
  const before=(await readFile(calls,'utf8'));
  await withYoutubeMedia(url,async()=> 'cached analysis');assert.equal(await readFile(calls,'utf8'),before);
  await assert.rejects(withYoutubeMedia(url,async source=>source(async name=>{path=name;throw new Error('Decode failed');})),{message:'Decode failed'});assert.equal(existsSync(path),false);
  process.env.YOUTUBE_TEST_MODE='wrong';await assert.rejects(youtubeMetadata('https://youtu.be/bbbbbbbbbbb'),{message:'YouTube returned a different video.'});
  process.env.YOUTUBE_TEST_MODE='fail';await assert.rejects(youtubeMetadata('https://youtu.be/ccccccccccc'),{status:422});
  process.env.YTDLP_PATH=join(directory,'missing');await assert.rejects(youtubeMetadata('https://youtu.be/ddddddddddd'),{status:503});
  await assert.rejects(youtubeMetadata(url,AbortSignal.abort(new Error('Stopped'))),{message:'Stopped'});
 }finally{for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;await rm(directory,{recursive:true,force:true});}
});
