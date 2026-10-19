import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEntityImage, canResolveEntityImage } from '../app/lib/entityImage.ts';

const id = 'a0642338-e780-4b75-817d-eb27dc768f05';
const image = 'https://images.qloo.com/venue.jpg';
test('simultaneous legacy image lookups share a request and keep the canonical image URL', async () => {
  let finish, calls = 0, options;
  const request = async (_url, init) => { calls++; options = init; return new Promise(resolve => { finish = resolve; }); };
  const first = loadEntityImage(id, false, request);
  const second = loadEntityImage(id.toUpperCase(), false, request);
  assert.equal(first, second);
  assert.equal(calls, 1);
  assert.equal(options.cache, 'default');
  assert.equal(options.credentials, 'same-origin');
  finish(Response.json({ id, image }));
  assert.deepEqual(await first, { id, image });
});
test('failed lookups are not retained and an explicit retry reloads metadata', async () => {
  await assert.rejects(loadEntityImage(id, false, async () => Response.json({ error: 'Provider unavailable.' }, { status: 502 })), { message: 'Provider unavailable.' });
  let options;
  const value = await loadEntityImage(id, true, async (_url, init) => { options = init; return Response.json({ id, image: null }); });
  assert.equal(options.cache, 'reload');
  assert.equal(value.image, null);
});
test('invalid or mismatched entity identities never populate another image', async () => {
  assert.equal(canResolveEntityImage('osm:123'), false);
  assert.throws(() => loadEntityImage('https://internal.invalid/image'), { name: 'ZodError' });
  await assert.rejects(loadEntityImage(id, false, async () => Response.json({ id: '866e0085-3c8e-4780-ba28-b837cafc3d6b', image })), { message: 'Photo lookup returned a different place or media item.' });
});
