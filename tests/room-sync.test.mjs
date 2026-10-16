import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomSync } from '../app/lib/roomSync.ts';
import { mergeRoom } from '../app/lib/roomMerge.ts';
import { emptyData } from '../app/lib/storage.ts';
const data = (workspaces = []) => ({...emptyData, workspaces});
const workspace = (id, name = id) => ({id, name});
function backend() {
  let snapshot = {data:data(), revision:0, imports:[]};
  let fail = false;
  const writes = [];
  const snapshots = new Map();
  const uploadSnapshot = async data => { const id=crypto.randomUUID(); snapshots.set(id,structuredClone(data)); return id; };
  const request = async (path, init) => {
    assert.equal(path, '/api/room');
    if (init?.method !== "PUT") return structuredClone(snapshot);
    if (fail) throw new Error('Offline');
    const input = JSON.parse(init.body);
    if (input.revision !== snapshot.revision) throw new Error('Conflict');
    snapshot = {...input, data:snapshots.get(input.fileId), revision:snapshot.revision+1};
    writes.push(input);
    return {revision:snapshot.revision};
  };
  return {request,writes,uploadSnapshot,set fail(value){fail=value;}, get snapshot(){return snapshot;}};
}
const store = (server) => new RoomSync(server.request, async value=>value, server.uploadSnapshot);
async function settle(sync) { await new Promise(resolve=>setImmediate(resolve)); await sync.flush(); }
test('a new browser restores the same account data from the backend', async()=>{
 const server=backend(), first=store(server); await first.load();
 assert.equal(first.update(previous=>({...previous,workspaces:[workspace('a')]})),true);
 await settle(first);
 const second=store(server); await second.load();
 assert.deepEqual(second.data,first.data); assert.equal(second.snapshot.revision,1);
});
test('failed saves retain unsaved work, block further edits, and can be retried',async()=>{
 const server=backend(),sync=store(server);await sync.load();server.fail=true;
 sync.update(previous=>({...previous,workspaces:[workspace('a')]}));await settle(sync);
 assert.equal(sync.unsaved,true);assert.ok(sync.error.includes('Offline'));assert.equal(sync.update(x=>x),false);
 server.fail=false;await sync.retry();assert.equal(sync.unsaved,false);assert.equal(server.snapshot.data.workspaces[0].id,'a');
});
test('load failures never substitute a successful empty workspace',async()=>{
 const sync=new RoomSync(async()=>{throw new Error('Unavailable');},async value=>value,async()=>crypto.randomUUID());
 await sync.load();assert.equal(sync.ready,false);assert.equal(sync.error,'Unavailable');assert.equal(sync.update(x=>x),false);
});
test('queued edits are serialized and coalesced without losing the final state',async()=>{
 const server=backend(); let release;
 const blocked=new Promise(resolve=>{release=resolve;});let first=true;
 const sync=new RoomSync(server.request,async value=>{if(first){first=false;await blocked;}return value;},server.uploadSnapshot);await sync.load();
 sync.update(previous=>({...previous,workspaces:[workspace('a')]}));
 sync.update(previous=>({...previous,workspaces:[...previous.workspaces,workspace('b')]}));
 release();await settle(sync);assert.deepEqual(server.snapshot.data.workspaces.map(x=>x.id),['a','b']);assert.equal(sync.unsaved,false);
});
test('concurrent changes to different items merge on explicit retry',async()=>{
 const server=backend(),a=store(server),b=store(server);await a.load();await b.load();
 a.update(previous=>({...previous,workspaces:[workspace('a')]}));await settle(a);
 b.update(previous=>({...previous,workspaces:[workspace('b')]}));await settle(b);assert.ok(b.error);
 await b.retry();assert.deepEqual(new Set(server.snapshot.data.workspaces.map(x=>x.id)),new Set(['a','b']));
});
test('conflicting edits remain visible and never overwrite the saved version',async()=>{
 const base=data([workspace('a')]);
 assert.throws(()=>mergeRoom(base,data([workspace('a','Local')]),data([workspace('a','Remote')])));
 const server=backend(),a=store(server);await a.load();a.update(()=>base);await settle(a);
 const b=store(server);await b.load();a.update(()=>data([workspace('a','Remote')]));await settle(a);
 b.update(()=>data([workspace('a','Local')]));await settle(b);await b.retry();
 assert.equal(b.data.workspaces[0].name,'Local');assert.equal(server.snapshot.data.workspaces[0].name,'Remote');assert.ok(b.unsaved);
});
test('account browser migration is recorded once and preserves cloud data',async()=>{
 const server=backend(),sync=store(server);await sync.load();await sync.import(data([workspace('legacy')]),'source-hash');
 assert.equal(server.snapshot.imports[0],'source-hash');const writes=server.writes.length;
 await sync.import(data([workspace('legacy')]),'source-hash');assert.equal(server.writes.length,writes);
 const other=store(server);await other.load();await other.import(data([workspace('other')]),'other-hash');
 assert.deepEqual(other.data.workspaces.map(x=>x.id),['legacy','other']);
});
test('migration conflicts preserve the cloud version and report a failure',async()=>{
 const server=backend(),sync=store(server);await sync.load();sync.update(()=>data([workspace('a','Cloud')]));await settle(sync);
 await assert.rejects(sync.import(data([workspace('a','Local')]),'legacy'));assert.equal(server.snapshot.data.workspaces[0].name,'Cloud');
});
test('separate accounts do not share workspaces',async()=>{
 const first=backend(),second=backend(),a=store(first),b=store(second);await a.load();await b.load();
 a.update(()=>data([workspace('private')]));await settle(a);await b.load();assert.equal(b.data.workspaces.length,0);
});
test('validation errors do not block a corrected edit',async()=>{
 const server=backend(),sync=store(server);await sync.load();
 assert.equal(sync.update(()=>{throw new Error('Duplicate name');}),false);
 assert.equal(sync.update(()=>data([workspace('corrected')])),true);
 await settle(sync);assert.equal(server.snapshot.data.workspaces[0].id,'corrected');
});
test('migration cannot save over an account that has not loaded',async()=>{
 const server=backend(),sync=store(server);
 await assert.rejects(sync.import(data([workspace('legacy')]),'hash'));
 assert.equal(server.writes.length,0);
});
test('saved chat history does not share a whole-workspace request size cap',async()=>{
 const server=backend(),sync=store(server);await sync.load();
 const value={...data([workspace('w')]),conversations:[{id:'c',workspaceId:'w',title:'History',draft:'',messages:[{id:'m',role:'user',text:'a'.repeat(4_000_001),createdAt:'2026-10-16T00:00:00.000Z'}]}]};
 assert.equal(sync.update(()=>value),true);await settle(sync);
 assert.ok(JSON.stringify(server.writes[0]).length<1000);
 const second=store(server);await second.load();assert.equal(second.data.conversations[0].messages[0].text.length,4_000_001);
});
test('sign-out waits for the current save acknowledgement',async()=>{
 const server=backend();let release;const gate=new Promise(resolve=>{release=resolve;});
 const sync=new RoomSync(server.request,async value=>{await gate;return value;},server.uploadSnapshot);await sync.load();
 sync.update(()=>data([workspace('saved')]));let done=false;const leaving=sync.saveBeforeLeaving().then(result=>{done=true;return result;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(done,false);release();assert.equal(await leaving,true);
});
test('switching accounts cancels pending work before it can commit under another session',async()=>{
 const server=backend();let release;const gate=new Promise(resolve=>{release=resolve;});
 const sync=new RoomSync(server.request,async value=>{await gate;return value;},server.uploadSnapshot);await sync.load();
 sync.update(()=>data([workspace('private')]));sync.dispose();release();await settle(sync);assert.equal(server.writes.length,0);
});
