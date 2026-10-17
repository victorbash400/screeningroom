import assert from 'node:assert/strict';
import test from 'node:test';
import { waitingForAnswer } from '../app/lib/agentActivity.ts';
const message = (...parts) => ({id:'reply',role:'assistant',parts});
test('waiting follows stream events before text and after a tool result', () => {
  assert.equal(waitingForAnswer(message()),true);
  assert.equal(waitingForAnswer(message({type:'text',text:'Hello',state:'streaming'})),false);
  assert.equal(waitingForAnswer(message({type:'text',text:'Searching',state:'done'},{type:'tool-searchEntities',toolCallId:'one',state:'input-available',input:{}})),false);
  assert.equal(waitingForAnswer(message({type:'tool-searchEntities',toolCallId:'one',state:'output-available',input:{},output:[]})),true);
  assert.equal(waitingForAnswer(message({type:'tool-searchEntities',toolCallId:'one',state:'output-error',input:{},errorText:'Unavailable'})),true);
  assert.equal(waitingForAnswer(message({type:'tool-searchEntities',toolCallId:'one',state:'output-available',input:{},output:[]},{type:'text',state:'streaming',text:'Found'})),false);
});

import { agentBlocks } from '../app/lib/agentActivity.ts';
import { finishReply } from '../app/lib/messageBlocks.ts';
import { parseData, emptyData } from '../app/lib/storage.ts';
test('text and tool calls retain their actual order through streaming and storage', () => {
  const ui=message({type:'text',text:'Looking up the film.',state:'done'},{type:'tool-searchEntities',toolCallId:'one',state:'output-available',input:{},output:[]},{type:'text',text:'**Inception** (2010).',state:'streaming'});
  const blocks=agentBlocks(ui);
  assert.deepEqual(blocks.map(block=>block.kind),['text','tool','text']);
  const reply=finishReply({id:'a',role:'assistant',status:'streaming',createdAt:'2026-10-16T10:00:00Z',text:'Looking up the film.\n\n**Inception** (2010).',blocks},'complete');
  const data={...emptyData,workspaces:[{id:'w',name:'Workspace'}],conversations:[{id:'c',workspaceId:'w',title:'Chats',draft:'',messages:[reply]}]};
  const saved=parseData(JSON.stringify(data)).conversations[0].messages[0];
  assert.deepEqual(saved.blocks,blocks);
  data.conversations[0].messages[0].blocks=[blocks[2],blocks[1],blocks[0]];
  assert.throws(()=>parseData(JSON.stringify(data)),{message:'Saved message data is invalid.'});
});
test('cancellation and failure settle active calls without inventing successful results',()=>{
  const reply={id:'a',text:'',createdAt:'2026-10-16T10:00:00Z',status:'streaming',waiting:true,blocks:agentBlocks(message({type:'tool-searchEntities',toolCallId:'one',state:'input-available',input:{}}))};
  assert.throws(()=>finishReply(reply,'complete'),{message:'Tool call ended without a result.'});
  assert.equal(finishReply(reply,'stopped').blocks[0].tool.state,'stopped');
  assert.equal(finishReply(reply,'stopped').waiting,false);
  assert.equal(finishReply(reply,'failed','Network failed').blocks[0].tool.state,'failed');
  assert.equal(agentBlocks(message({type:'tool-searchEntities',toolCallId:'one',state:'output-denied',input:{}}))[0].tool.state,'failed');
});

test('each streamed tool keeps its own clock and terminal durations survive saving',()=>{
 const activity=new Map();
 const first={type:'tool-searchEntities',toolCallId:'one',state:'input-available',input:{}};
 let blocks=agentBlocks(message(first),activity,1000);
 assert.equal(blocks[0].tool.startedAt,1000);
 blocks=agentBlocks(message({...first,state:'output-available',output:[]},{...first,toolCallId:'two'}),activity,3600);
 assert.equal(blocks[0].tool.endedAt,3600);
 assert.equal(blocks[1].tool.startedAt,3600);
 blocks=agentBlocks(message({...first,state:'output-available',output:[]},{...first,toolCallId:'two',state:'output-error',errorText:'Unavailable'}),activity,5000);
 assert.equal(blocks[0].tool.endedAt,3600);
 assert.equal(blocks[1].tool.endedAt,5000);
 assert.equal(blocks[1].tool.state,'failed');
 const saved=finishReply({id:'a',text:'',createdAt:'2026-10-17T10:00:00Z',blocks},'complete');
 const data={...emptyData,workspaces:[{id:'w',name:'Workspace'}],conversations:[{id:'c',workspaceId:'w',title:'Chats',draft:'',messages:[saved]}]};
 assert.deepEqual(parseData(JSON.stringify(data)).conversations[0].messages[0].blocks,blocks);
 const stopped=finishReply({id:'a',text:'',createdAt:'2026-10-17T10:00:00Z',blocks:agentBlocks(message(first),new Map(),1000)},'stopped',undefined,2800);
 assert.equal(stopped.blocks[0].tool.endedAt,2800);
});

test('parallel calls and streamed text never show a duplicate waiting indicator',()=>{
 const active={type:'tool-searchEntities',toolCallId:'one',state:'input-available',input:{}};
 assert.equal(waitingForAnswer(message(active,{...active,toolCallId:'two',state:'output-available',output:[]})),false);
 assert.equal(waitingForAnswer(message({type:'text',state:'done',text:'Here is the answer.'})),false);
 assert.equal(waitingForAnswer(message(active,{type:'text',state:'done',text:'Checking.'})),false);
});
