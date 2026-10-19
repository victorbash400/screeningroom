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

test('demo reopens on every mount, while only an unseen empty real account opens automatically', () => {
  for (const demo of [true, false]) for (const seen of [true, false]) for (const empty of [true, false]) {
    assert.equal(shouldOpenTour({ demo, seen }, empty), demo || empty && !seen);
  }
  assert.equal(tourStatusSchema.safeParse({ demo: null, seen: true }).success, false);
  assert.deepEqual(tourSteps.map(step => step.id), ['workspace', 'import', 'select', 'question', 'live', 'digital', 'evidence']);
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
