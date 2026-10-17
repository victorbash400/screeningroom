import test from 'node:test';
import assert from 'node:assert/strict';
import {csvRows, performanceRows, projectPerformance} from '../app/lib/performanceData.ts';
import {researchWidgetSchema} from '../app/lib/researchWidget.ts';

const file={id:'asset',name:'Campaign results.csv'};
test('CSV handles quoted commas, escaped quotes, multiline values and CRLF without dropping records',()=>{
 assert.deepEqual(csvRows('campaign,clicks\r\n"A, B",10\r\n"A ""test""\nline",2'),[['campaign','clicks'],['A, B','10'],['A "test"\nline','2']]);
 assert.throws(()=>csvRows('a,b\n"not closed'));
 assert.throws(()=>performanceRows('a,a\n1,2','csv'));
 assert.throws(()=>performanceRows('a,b\n1','csv'));
 assert.throws(()=>performanceRows('{"a":1}','json'));
});
test('performance totals use weighted denominators and keep zero measurements without invented rates',()=>{
 const rows=performanceRows('campaign,impressions,clicks,conversions,spend,revenue\nA,100,20,2,10,30\nA,900,30,3,90,170\nB,0,0,0,0,0','csv');
 const widget=projectPerformance(rows,file,{impressions:'impressions',clicks:'clicks',conversions:'conversions',spend:'spend',revenue:'revenue'},'campaign');
 assert.equal(researchWidgetSchema.safeParse(widget).success,true);
 const a=Object.fromEntries(widget.subjects[0].metrics.map(m=>[m.key,m.value]));
 assert.equal(a.ctr,5); assert.equal(a.conversionRate,10); assert.equal(a.roas,2);
 const b=widget.subjects[1].metrics;
 assert.equal(b.find(m=>m.key==='clicks').value,0);
 assert.equal(b.some(m=>m.key==='ctr'||m.key==='roas'),false);
});
test('missing, malformed, negative and fractional counts fail instead of becoming zero',()=>{
 for(const value of ['',null,'not a number',-1,1.5]) assert.throws(()=>projectPerformance([{clicks:value}],file,{clicks:'clicks'}));
 assert.throws(()=>projectPerformance([{clicks:1}],file,{}));
 assert.throws(()=>projectPerformance([{clicks:1}],file,{clicks:'clicks'},'missing'));
});

test('monetary exports with different currency values are not silently summed',()=>{
 assert.throws(()=>projectPerformance([{spend:10,currency:'USD'},{spend:20,currency:'EUR'}],file,{spend:'spend'}));
});

test('selected media waits only for unsaved assets, not unrelated chat-only changes',async()=>{
 const {mediaSelectionSaved}=await import('../app/lib/selectedMediaNodes.ts');
 const nodes=[{id:'folder',kind:'folder',parentId:null,name:'Media'},{id:'asset',kind:'file',parentId:'folder',name:'Brief.txt',content:'cloud-file:one'}];
 assert.equal(mediaSelectionSaved(['folder'],nodes,nodes.map(node=>({...node}))),true);
 assert.equal(mediaSelectionSaved(['folder'],nodes,[nodes[0]]),false);
 assert.equal(mediaSelectionSaved(['asset'],[{...nodes[1],content:'cloud-file:two'}],nodes),false);
});
