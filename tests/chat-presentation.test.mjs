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
  if(specifier.endsWith('/AccountContext'))return stub('export const useAccount=()=>({user:{id:"test"},request:async()=>{throw new Error("Unexpected request")}});');
  if(specifier.endsWith('.css'))return stub('export default new Proxy({}, {get:(_,name)=>String(name)});');
  if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.tsx','.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return next(url.href,context);}
  return next(specifier,context);
 },
 load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:swc.transformSync(readFileSync(fileURLToPath(url),'utf8'),{filename:fileURLToPath(url),jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'es6'}}).code};return next(url,context);}
});
const {default:AssistantMessage}=await import('../app/components/chat/AssistantMessage.tsx');
const {default:Connections}=await import('../app/components/account/Connections.tsx');
const reply={id:'a',role:'assistant',status:'complete',createdAt:'2026-10-16T10:00:00Z',text:'Before\n\nAfter',blocks:[{id:'first',kind:'text',text:'Before'},{id:'tool:t',kind:'tool',tool:{id:'t',name:'searchEntities',state:'done'}},{id:'last',kind:'text',text:'After'}]};
test('rendered transcript keeps the tool between its related text blocks with a stable terminal icon',()=>{
 const html=renderToStaticMarkup(createElement(AssistantMessage,{message:reply}));
 assert.ok(html.indexOf('Before')<html.indexOf('Qloo search'));
 assert.ok(html.indexOf('Qloo search')<html.indexOf('After'));
 assert.ok(html.includes('lucide-square-terminal'));
 assert.ok(!html.includes('lucide-check'));
 assert.ok(!html.includes('Waiting for answer'));
});
test('Markdown tables, links and emphasis render as structured elements',()=>{
 const text='**Film**\n\n| Name | Year |\n| --- | --- |\n| Inception | 2010 |\n\n[Source](https://example.com)';
 const html=renderToStaticMarkup(createElement(AssistantMessage,{message:{...reply,text,blocks:[{id:'text',kind:'text',text}]}}));
 for(const element of ['<strong>Film</strong>','<table>','<thead>','<td>2010</td>','href="https://example.com"'])assert.ok(html.includes(element),element);
});
test('loading belongs to the unfinished reply and disappears in all terminal states',()=>{
 for(const status of ['streaming','complete','stopped','failed']){
  const html=renderToStaticMarkup(createElement(AssistantMessage,{message:{...reply,blocks:[],text:'',status,waiting:true}}));
  assert.equal(html.includes('Waiting for answer'),status==='streaming');
 }
});
test('connection rows and their actions exist before any status request finishes',()=>{
 const html=renderToStaticMarkup(createElement(Connections));
 for(const label of ['Authentication','Database','Storage','Bedrock','Qloo API']){
  assert.ok(html.includes(`Check ${label}`));
  assert.ok(html.includes(`Checking ${label}`));
 }
 assert.equal(html.split('disabled=""').length-1,5);
});
