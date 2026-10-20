import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import test from 'node:test';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){const url=new URL(specifier+'.ts',context.parentURL);if(existsSync(url))return next(url.href,context);}return next(specifier,context);}});
const {tourScripts,tourSceneAt}=await import('../app/components/onboarding/tourScript.ts');
const {exampleQuestion}=await import('../app/components/onboarding/tourExample.ts');
test('each chapter has ordered actions, a visible click interval and a finite ending',()=>{
 for(const [step,script] of Object.entries(tourScripts)){
  let end=-1;
  for(const cue of script.cues){assert.ok(cue.at>end,step);assert.ok(cue.commit>cue.at);assert.ok(cue.commit<script.duration);assert.ok(cue.label&&cue.target);end=cue.commit;}
 }
});
test('workspace creation includes naming, opening and visible file import within eight seconds',()=>{
 assert.equal(tourSceneAt('workspace',0).workspaceExists,false);
 assert.equal(tourSceneAt('workspace',1000).createOpen,true);
 assert.ok(tourSceneAt('workspace',1500).workspaceName.length>0);
 assert.equal(tourSceneAt('workspace',2000).workspaceName,'Night Signals');
 assert.equal(tourSceneAt('workspace',2800).workspaceExists,true);
 assert.equal(tourSceneAt('workspace',3900).workspaceOpen,true);
 assert.equal(tourSceneAt('workspace',5000).importOpen,true);
 assert.equal(tourSceneAt('workspace',6000).importBusy,true);
 assert.equal(tourSceneAt('workspace',6500).importItems,3);
 assert.equal(tourSceneAt('workspace',8000).uploaded,true);
 assert.equal(tourSceneAt('workspace',8000).importOpen,false);
 assert.equal(tourSceneAt('workspace',0).workspaceExists,false);
});
test('seeking reconstructs file selection and typing in either direction',()=>{
 assert.deepEqual(tourSceneAt('question',2700).references,['tour-trailer','tour-brief']);
 assert.equal(tourSceneAt('question',2700).pickerOpen,true);
 assert.equal(tourSceneAt('question',4500).pickerOpen,false);
 const mid=tourSceneAt('question',6500).draft;
 assert.ok(mid.length>0&&mid.length<exampleQuestion.length);
 assert.ok(exampleQuestion.startsWith(mid));
 assert.equal(tourSceneAt('question',8800).draft,exampleQuestion);
 assert.equal(tourSceneAt('question',10000).sent,true);
 assert.equal(tourSceneAt('question',10000).draft,'');
 assert.deepEqual(tourSceneAt('question',0).references,[]);
 assert.equal(tourSceneAt('question',6500).draft,mid);
});
test('map, platform and evidence states can be undone by seeking',()=>{
 assert.equal(tourSceneAt('live',3000).radius,10000);
 assert.equal(tourSceneAt('live',6500).venue,1);
 assert.equal(tourSceneAt('live',12500).mapOpen,false);
 assert.equal(tourSceneAt('live',0).radius,5000);
 assert.equal(tourSceneAt('digital',2500).audienceMode,'digital');
 assert.equal(tourSceneAt('digital',35000).mapOpen,true);
 assert.equal(tourSceneAt('digital',46000).mapOpen,false);
 assert.equal(tourSceneAt('evidence',2000).evidenceOpen,true);
 assert.equal(tourSceneAt('evidence',0).evidenceOpen,false);
});
test('chapters leave room for full results, follow-ups and deterministic scrolling',()=>{
 assert.equal(Object.keys(tourScripts).length,5);
 const ask=tourSceneAt('question',32500);
 assert.ok(ask.answerTime>=8200);
 assert.ok(ask.scrollProgress>0 && ask.scrollProgress<1);
 const live=tourSceneAt('live',25000);
 assert.equal(live.venue,2);
 assert.equal(live.venueEvidenceOpen,true);
 assert.ok(live.followupTime>0);
 assert.equal(tourSceneAt('live',16000).followupTime,-1);
 const digital=tourSceneAt('digital',40000);
 assert.ok(digital.followupTime>=8200);
 assert.ok(digital.catalogueScroll>0 && digital.catalogueScroll<1);
 assert.equal(digital.comparisonScroll,1);
 assert.equal(digital.comparableScroll,1);
 assert.equal(tourSceneAt('digital',1000).followupTime,-1);
 assert.equal(tourSceneAt('digital',1000).catalogueScroll,0);
 const before=tourSceneAt('digital',14000);
 tourSceneAt('digital',tourScripts.digital.duration);
 assert.deepEqual(tourSceneAt('digital',14000),before);
 assert.equal(tourSceneAt('digital',0).comparisonScroll,0);
 assert.equal(tourSceneAt('digital',17000).comparableScroll,0);
 assert.ok(tourSceneAt('digital',26700).comparableScroll>0 && tourSceneAt('digital',26700).comparableScroll<1);
 assert.equal(tourSceneAt('evidence',11000).evidenceTool,'venues');
 assert.ok(tourSceneAt('evidence',11000).evidenceScroll>0);
 assert.equal(tourScripts.workspace.cues.at(-1).click,false);
});

test('Ask holds the selected trailer frames, transcript and poster before venue results',()=>{
 assert.deepEqual(tourSceneAt('question',3500).references,['tour-trailer','tour-brief','tour-poster']);
 assert.equal(tourSceneAt('question',15000).mediaFramesOpen,true);
 assert.equal(tourSceneAt('question',19000).mediaFramesOpen,false);
 assert.equal(tourSceneAt('question',19000).mediaTranscriptOpen,true);
 assert.equal(tourSceneAt('question',23000).scrollTo,'image');
 assert.equal(tourSceneAt('question',28000).scrollTo,'venues');
 assert.equal(tourSceneAt('question',12000).mediaFramesOpen,false);
 assert.ok(tourScripts.question.duration>=35000);
 assert.ok(tourScripts.live.duration>=50000);
 assert.ok(tourScripts.digital.duration>=50000);
});
