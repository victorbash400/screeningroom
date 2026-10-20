import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import test from 'node:test';
registerHooks({resolve(specifier,context,next){
 if(specifier==='next/server')return next('next/server.js',context);
 if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){const url=new URL(specifier+'.ts',context.parentURL);if(existsSync(url))return next(url.href,context);}
 return next(specifier,context);
}});
const {withMediaFailureGuard}=await import('../app/server/media-failure-guard.ts');
const options={toolCallId:'test',messages:[]};
test('a failed media asset cannot trigger another provider call in the same reply',async()=>{
 let calls=0;
 const transcribeMedia={execute:async({fileId})=>{calls++;if(fileId==='failed')throw new Error('capacity');return {fileId};}};
 const inspectVideo={execute:async()=>{calls++;return {};}};
 const tools=withMediaFailureGuard({transcribeMedia,inspectVideo});
 await assert.rejects(tools.transcribeMedia.execute({fileId:'failed'},options),{message:'capacity'});
 await assert.rejects(tools.transcribeMedia.execute({fileId:'failed',startSeconds:30,language:'English'},options),{status:409});
 await assert.rejects(tools.inspectVideo.execute({fileId:'failed'},options),{status:409});
 assert.equal(calls,1);
 assert.deepEqual(await tools.transcribeMedia.execute({fileId:'other'},options),{fileId:'other'});
 const nextReply=withMediaFailureGuard({transcribeMedia});
 await assert.rejects(nextReply.transcribeMedia.execute({fileId:'failed'},options),{message:'capacity'});
 assert.equal(calls,3);
});
test('partial audio failure blocks retries through selected link and alternate YouTube URL',async()=>{
 let calls=0;
 const definition={execute:async()=>{calls++;return {transcriptError:'Audio failed',summary:'Observed visuals'};}};
 const tools=withMediaFailureGuard({inspectVideo:definition,transcribeLinkedMedia:definition},[{id:'selected',sourceUrl:'https://youtu.be/jNQXAC9IVRw'}]);
 const result=await tools.inspectVideo.execute({fileId:'selected'},options);
 assert.equal(result.summary,'Observed visuals');
 await assert.rejects(tools.transcribeLinkedMedia.execute({url:'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=20'},options),{status:409});
 assert.equal(calls,1);
});
test('successful ranges and non-media tools remain available',async()=>{
 let calls=0;
 const definition={execute:async()=>{calls++;return {segments:[]};}};
 const tools=withMediaFailureGuard({transcribeMedia:definition,searchEntities:definition});
 await tools.transcribeMedia.execute({fileId:'audio',startSeconds:0},options);
 await tools.transcribeMedia.execute({fileId:'audio',startSeconds:30},options);
 await tools.searchEntities.execute({query:'music'},options);
 assert.equal(calls,3);
});
