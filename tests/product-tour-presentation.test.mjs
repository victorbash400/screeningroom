import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import test from 'node:test';
const require=createRequire(import.meta.url),swc=require('next/dist/build/swc');await swc.loadBindings();
const stub=source=>({url:`data:text/javascript,${encodeURIComponent(source)}`,shortCircuit:true});
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='next/dynamic')return stub('export default ()=>()=>null;');
  if(specifier.endsWith('/AccountContext'))return stub(`import {createContext} from ${JSON.stringify(import.meta.resolve('react'))}; export const AccountContext=createContext(null); export const useAccount=()=>({user:{id:"test"},request:async()=>{throw new Error("Unexpected request")}});`);
  if(specifier.endsWith('.css'))return stub('export default new Proxy({}, {get:(_,name)=>String(name)});');
  if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.tsx','.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return next(url.href,context);}
  return next(specifier,context);
 },
 load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:swc.transformSync(readFileSync(fileURLToPath(url),'utf8'),{filename:fileURLToPath(url),jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'es6'}}).code};return next(url,context);}
});

const {default:TourPreview}=await import('../app/components/onboarding/TourPreview.tsx');
const {default:TourNavigation}=await import('../app/components/onboarding/TourNavigation.tsx');
const {default:ReferencePicker}=await import('../app/components/chat/ReferencePicker.tsx');
const {tourSteps}=await import('../app/lib/productTour.ts');
const {exampleFiles,exampleWorkspace}=await import('../app/components/onboarding/tourExample.ts');
const action=()=>{};
test('all seven scenes render the shared composer and toolbar',()=>{
 for(const step of tourSteps){
  const html=renderToStaticMarkup(createElement(TourPreview,{step:step.id,onRestart:action}));
  for(const label of ['Search workspaces and files','Info','Import','Audience'])assert.ok(html.includes(label),step.id+': '+label);
  if(!['workspace','import'].includes(step.id)){
   for(const label of ['New chat','Select','Message'])assert.ok(html.includes(label),step.id+': '+label);
   assert.ok(html.includes('Night Signals'));
  }
  if(step.id==='digital')assert.ok(html.includes('YouTube')&&html.includes('Netflix'));
  if(step.id==='evidence')assert.ok(html.includes('Qloo search details')&&html.includes('Radiohead'));
 }
});
test('the last step exposes Finish, the first disables Back, and every step has direct navigation',()=>{
 const first=renderToStaticMarkup(createElement(TourNavigation,{index:0,onStep:action,onClose:action}));
 const last=renderToStaticMarkup(createElement(TourNavigation,{index:tourSteps.length-1,onStep:action,onClose:action}));
 assert.ok(first.includes('disabled=""'));
 assert.ok(first.includes('Next'));
 assert.ok(last.includes('Finish'));
 assert.ok(last.includes('7 / 7'));
 for(const step of tourSteps)assert.ok(first.includes(step.title));
});
test('the embedded picker preserves the actual tree and selection controls',()=>{
 const html=renderToStaticMarkup(createElement(ReferencePicker,{embedded:true,nodes:exampleFiles,workspaces:[exampleWorkspace],workspaceId:exampleWorkspace.id,selectedIds:['tour-brief'],onSelect:action,onClose:action}));
 for(const label of ['Select files','Trailer.mp4','Production brief.txt','Poster.jpg','Selected (1)','Done'])assert.ok(html.includes(label));
 assert.ok(html.includes('data-embedded="true"'));
 assert.ok(html.includes('open=""'));
});
