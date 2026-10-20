import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('build preparation replaces a wrong-platform binary, verifies reuse, restores execution and rejects corrupt downloads',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'screeningroom-youtube-build-'));
 const binary=join(directory,'.media-bin',process.platform==='win32'?'yt-dlp.exe':'yt-dlp');
 const log=join(directory,'downloads');
 const env={...process.env,YOUTUBE_DOWNLOAD_TEST_LOG:log};delete env.YTDLP_PATH;
 const run=()=>spawnSync(process.execPath,['--import',resolve('tests/helpers/youtube-download.mjs'),resolve('scripts/prepare-youtube.mjs')],{cwd:directory,env,encoding:'utf8'});
 try{
  await mkdir(join(directory,'.media-bin'));
  await writeFile(binary,'a binary from a different operating system',{mode:0o644});
  assert.equal(run().status,0);
  assert.equal(await readFile(binary,'utf8'),'verified binary for the build platform');
  if(process.platform!=='win32')assert.equal((await stat(binary)).mode&0o111,0o111);
  const first=await readFile(log,'utf8');assert.equal(first.trim().split('\n').length,1);
  assert.equal(run().status,0);assert.equal(await readFile(log,'utf8'),first);
  await writeFile(binary,'wrong platform again');env.YOUTUBE_DOWNLOAD_TEST_CORRUPT='true';
  const corrupt=run();assert.notEqual(corrupt.status,0);assert.ok(corrupt.stderr.includes('checksum verification failed'));
  assert.equal(await readFile(binary,'utf8'),'wrong platform again');
 }finally{await rm(directory,{recursive:true,force:true});}
});
