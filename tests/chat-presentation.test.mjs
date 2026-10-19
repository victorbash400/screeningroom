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

test('tool durations render independently and frozen calls do not need a live clock',()=>{
 const blocks=[{id:'tool:first',kind:'tool',tool:{id:'first',name:'inspectVideo',state:'done',startedAt:1000,endedAt:4500}},{id:'tool:second',kind:'tool',tool:{id:'second',name:'transcribeMedia',state:'running',startedAt:4500}}];
 const html=renderToStaticMarkup(createElement(AssistantMessage,{message:{...reply,status:'streaming',blocks,text:'',waiting:false}}));
 assert.ok(html.includes('0:03'));
 assert.ok(html.includes('0:00'));
 assert.ok(!html.includes('Waiting for answer'));
 assert.ok(html.indexOf('Video analysis')<html.indexOf('Audio transcription'));
});

test('Chat accepts a first message directly without retired workflow cards',async()=>{
 const {default:ChatDrawer}=await import('../app/components/chat/ChatDrawer.tsx');
 const action=()=>true,props={onAudienceWidget:action,onMapScene:action,onLocationInterest:action,busy:false,onStop:action,referenceRequest:0,draft:'',onThread:action,conversations:[],nodes:[],workspaces:[{id:'w',name:'Workspace'}],workspaceId:'w',onClose:action,onNew:action,onSelect:action,onRename:action,onDelete:action,onDraft:action,onSend:action,onReference:action};
 const conversation={id:'c',workspaceId:'w',channel:'chat',title:'Chats',draft:'',messages:[]};
 const empty=renderToStaticMarkup(createElement(ChatDrawer,{...props,conversation}));
 assert.ok(empty.includes('aria-label="Message"'));
 assert.ok(!empty.includes('Find similar media'));
 assert.ok(!empty.includes('Compare with existing media'));
 assert.ok(empty.includes('aria-label="New chat"'));
 const active=renderToStaticMarkup(createElement(ChatDrawer,{...props,conversation:{...conversation,messages:[{...reply,text:'Hello',blocks:[{id:'text',kind:'text',text:'Hello'}]}]}}));
 assert.ok(!active.includes('Find similar media'));
 assert.ok(active.includes('aria-label="Message"'));
});

test('tool searches disclose their actual inputs inline without a modal',()=>{
 const message={...reply,text:'',blocks:[{id:'tool:t',kind:'tool',tool:{id:'t',name:'searchEntities',state:'done',trace:{input:{query:'Daft Punk',type:'artist'},matches:[{id:'artist-id',name:'Daft Punk'}]}}}]};
 const html=renderToStaticMarkup(createElement(AssistantMessage,{message}));
 assert.ok(html.includes('<details'));
 assert.ok(html.includes('<summary'));
 assert.ok(html.includes('aria-label="Qloo search details"'));
 assert.ok(html.includes('Daft Punk'));
 assert.ok(html.includes('artist-id'));
 assert.equal(html.includes('<dialog'),false);
 assert.equal(html.includes('aria-haspopup="dialog"'),false);
});

test('platform comparisons use local uncropped logos rather than provider poster photos',async()=>{
 const {default:ResearchComparison}=await import('../app/components/research/ResearchComparison.tsx');
 const subjects=['Spotify','Apple Music','Bandcamp'].map((name,index)=>({id:String(index),name,image:'https://images.qloo.com/cropped-brand.jpg',tags:[],metrics:[]}));
 const html=renderToStaticMarkup(createElement(ResearchComparison,{widget:{kind:'comparison',subjectLabel:'Platform',title:'Platform affinity',source:'Qloo',retrievedAt:'2026-10-19T09:00:00Z',evidenceId:'e',subjects,commonTags:[],basis:'Query evidence'}}));
 for(const logo of ['spotify.svg','apple-music.svg','bandcamp.svg'])assert.ok(html.includes('/platforms/'+logo));
 assert.equal(html.includes('cropped-brand.jpg'),false);
});

test('joined Audience keeps history in the chat header and a labelled map toggle in the left controls',async()=>{
 const {default:ChatHeader}=await import('../app/components/chat/ChatHeader.tsx');
 const action=()=>true;
 const html=renderToStaticMarkup(createElement(ChatHeader,{label:'Audience',audienceMode:'live',onAudienceMode:action,mapOpen:true,onMapToggle:action,conversation:{id:'c',scope:'workspace'},historyOpen:false,onHistory:action,onNew:action,onClose:action,onRename:action,onDelete:action,threadOpen:false,onBack:action}));
 const map=html.indexOf('class="mapControls"'),chat=html.indexOf('class="chatControls"'),history=html.indexOf('aria-label="Chats"');
 assert.ok(map>=0&&map<chat&&chat<history);
 assert.ok(html.includes('<span>Map</span>'));
 assert.ok(html.includes('role="switch"'));
 const drawerCss=readFileSync(new URL('../app/components/chat/ChatDrawer.module.css',import.meta.url),'utf8');
 assert.ok(drawerCss.includes('.workspace > .body { min-width: 0; overflow: hidden; }'));
});

test('venue explanations disclose named contributions inline with exact weights and the source profile',async()=>{
 const {default:VenueEvidence}=await import('../app/components/locations/VenueEvidence.tsx');
 const html=renderToStaticMarkup(createElement(VenueEvidence,{place:{name:'Everyman',contributions:[{id:'ref',name:'Inception',score:.55}],audienceProfile:'Provider-described visitor mix.'}}));
 for(const value of ['<details','<summary','Why this venue','Inception','0.550','width:55','Qloo venue profile','Provider-described visitor mix.'])assert.ok(html.includes(value),value);
 assert.equal(html.includes('<dialog'),false);
});
