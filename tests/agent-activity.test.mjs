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
