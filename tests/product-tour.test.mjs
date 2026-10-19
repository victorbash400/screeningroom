import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(url)) return next(url.href, context);
  }
  return next(specifier, context);
} });
const { shouldOpenTour, tourStatusSchema, tourSteps } = await import('../app/lib/productTour.ts');
const { createTourRequests } = await import('../app/components/onboarding/tourRequests.ts');
const { tourUserMessage, tourMessages, tourAnswer } = await import('../app/components/onboarding/tourConversation.ts');

test('demo reopens on every mount, while only an unseen empty real account opens automatically', () => {
  for (const demo of [true, false]) for (const seen of [true, false]) for (const empty of [true, false]) {
    assert.equal(shouldOpenTour({ demo, seen }, empty), demo || empty && !seen);
  }
  assert.equal(tourStatusSchema.safeParse({ demo: null, seen: true }).success, false);
  assert.deepEqual(tourSteps.map(step => step.id), ['workspace', 'question', 'live', 'digital', 'evidence']);
});

test('walkthrough requests never reach the network or save another session’s home', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Walkthrough escaped to the network'); };
  try {
    const first = createTourRequests(), second = createTourRequests();
    const home = { name: 'Example location', latitude: 51.5, longitude: -.12 };
    const before = await second.request('/api/locations/home');
    await first.request('/api/locations/home', { method: 'PUT', body: JSON.stringify({ home, revision: 0 }) });
    assert.deepEqual(await first.request('/api/locations/home'), { home, revision: 1 });
    assert.deepEqual(await second.request('/api/locations/home'), before);
    await assert.rejects(first.request('/api/room', { method: 'PUT' }), { message: 'This action is unavailable in the walkthrough.' });
    const places = await first.request('/api/locations/search?q=Curzon');
    assert.equal(places.places.length, 1);
    assert.equal(places.places[0].name, 'Curzon Soho');
    const scene = await first.request('/api/locations/venues', { method: 'POST' });
    assert.equal(scene.threeD, true);
    assert.equal(scene.locations.length, 3);
    assert.ok(scene.locations.every(place => place.affinity === undefined && place.source !== 'Qloo'));
  } finally { globalThis.fetch = original; }
});

test('sample conversations retain selected file identities and identify simulated evidence', () => {
  const message = tourUserMessage('question', 'Find an audience', ['tour-brief', 'unknown-real-file']);
  assert.deepEqual(message.references.map(file => file.id), ['tour-brief']);
  assert.equal(message.references[0].workspaceId, 'tour-workspace');
  const live = tourMessages('live'), digital = tourMessages('digital', 20000, 20000);
  assert.ok(live[1].text.includes('Night Signals'));
  assert.ok(digital[3].text.includes('predict views'));
  assert.equal(digital[0].text, live[0].text);
  assert.equal(digital[1].text, live[1].text);
  const first = tourAnswer('first', 'live'), second = tourAnswer('second', 'live');
  const trace = first.blocks.find(block => block.kind === 'tool' && block.tool.name === 'searchEntities').tool.trace;
  assert.equal(trace.input.query, 'Radiohead');
  assert.equal(trace.matches[0].name, 'Radiohead (example match)');
  assert.equal(trace.matches[0].id, '00000000-0000-4000-8000-000000000001');
  assert.notEqual(first.blocks[0].id, second.blocks[0].id);
});

test('replies progress through waiting, streamed text, running tools, results and completion', () => {
  const waiting=tourAnswer('reply','live',100);
  assert.equal(waiting.status,'streaming');
  assert.equal(waiting.waiting,true);
  assert.equal(waiting.text,'');
  const partial=tourAnswer('reply','live',1800), full=tourAnswer('reply','live');
  assert.ok(partial.text.length>0 && partial.text.length<full.text.length);
  const running=tourAnswer('reply','live',4500).blocks.find(block=>block.kind==='tool' && block.tool.name==='searchAudienceVenues').tool;
  assert.equal(running.state,'running');
  assert.equal(running.widget,undefined);
  const result=tourAnswer('reply','live',5600).blocks.find(block=>block.kind==='tool' && block.tool.name==='searchAudienceVenues').tool;
  assert.equal(result.state,'done');
  assert.equal(result.widget.venues.length,3);
  assert.equal(full.status,'complete');
  assert.equal(tourAnswer('reply','live',1800).text,partial.text);
});

test('digital sample contains platform and comparable evidence in the real widget schemas', () => {
  const digital=tourAnswer('digital','digital');
  const widget=digital.blocks.find(block=>block.kind==='tool' && block.tool.research).tool.research;
  assert.equal(widget.kind,'digital');
  assert.deepEqual(widget.platforms.subjects.map(subject=>subject.name),['YouTube','Vimeo','MUBI']);
  assert.equal(widget.comparables.subjects.length,2);
  assert.ok(widget.comparables.subjects.every(subject=>!['Radiohead','Stop Making Sense'].includes(subject.name)));
  assert.ok(widget.comparables.subjects.every(subject=>subject.metrics.some(metric=>metric.unit==='rating10')));
  for(const subject of widget.platforms.subjects) assert.equal(subject.metrics[0].source,'Scripted example');
  assert.ok(widget.basis.includes('illustrative'));
});

test('sample lookups, signal inputs and venue contributions use the same identities',()=>{
 const answer=tourAnswer('consistent','live');
 const tools=answer.blocks.filter(block=>block.kind==='tool').map(block=>block.tool);
 const matches=tools.flatMap(tool=>tool.trace?.matches??[]);
 const venues=tools.find(tool=>tool.widget?.kind==='venues');
 for(const id of venues.trace.input.entityIds) assert.ok(matches.some(match=>match.id===id));
 for(const venue of venues.widget.venues) for(const contribution of venue.contributions) assert.ok(venues.trace.input.entityIds.includes(contribution.id));
});
