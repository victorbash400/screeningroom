import {createHash} from 'node:crypto';
import {appendFile} from 'node:fs/promises';
const bytes=Buffer.from('verified binary for the build platform');
const hash=createHash('sha256').update(bytes).digest('hex');
globalThis.fetch=async url=>{
 const asset=new URL(url).pathname.split('/').at(-1);
 if(asset==='SHA2-256SUMS')return new Response(['yt-dlp_macos','yt-dlp.exe','yt-dlp_linux','yt-dlp_linux_aarch64'].map(name=>`${hash}  ${name}`).join('\n'));
 await appendFile(process.env.YOUTUBE_DOWNLOAD_TEST_LOG,asset+'\n');
 return new Response(process.env.YOUTUBE_DOWNLOAD_TEST_CORRUPT ? 'corrupt download' : bytes);
};
