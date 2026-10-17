import assert from 'node:assert/strict';
import test from 'node:test';
import { thumbnailKind, thumbnailSize } from '../app/lib/mediaThumbnail.ts';
import { parseData, emptyData } from '../app/lib/storage.ts';
import { mergeRoom } from '../app/lib/roomMerge.ts';

test('thumbnail dimensions preserve aspect ratio without upscaling originals', () => {
  assert.deepEqual(thumbnailSize(4000, 2000), { width: 640, height: 320 });
  assert.deepEqual(thumbnailSize(1200, 2400), { width: 320, height: 640 });
  assert.deepEqual(thumbnailSize(100, 80), { width: 100, height: 80 });
  for (const size of [[0, 1], [1, Infinity], [NaN, 1]]) assert.throws(() => thumbnailSize(...size));
});
test('only uploaded image and video files create thumbnails', () => {
  const node = { kind: 'file', name: 'photo.JPG', content: 'cloud-file:original' };
  assert.equal(thumbnailKind(node), 'image');
  assert.equal(thumbnailKind({ ...node, name: 'clip.mov' }), 'video');
  assert.equal(thumbnailKind({ ...node, name: 'photo', mimeType: 'image/png' }), 'image');
  assert.equal(thumbnailKind({ ...node, name: 'file.txt' }), undefined);
  assert.equal(thumbnailKind({ ...node, sourceUrl: 'https://example.com/photo.jpg' }), undefined);
  assert.equal(thumbnailKind({ ...node, kind: 'folder' }), undefined);
});
test('thumbnail references survive saved room data and malformed dimensions fail explicitly', () => {
  const node = { id: 'n', workspaceId: 'w', parentId: null, kind: 'file', name: 'photo.jpg',
    content: 'cloud-file:original', updatedAt: '2026-10-17T00:00:00Z',
    thumbnail: { source: 'cloud-file:original', content: 'cloud-file:thumb', width: 640, height: 320 } };
  const data = { ...emptyData, workspaces: [{ id: 'w', name: 'Media' }], nodes: [node] };
  assert.deepEqual(parseData(JSON.stringify(data)).nodes[0].thumbnail, node.thumbnail);
  for (const width of [0, -1, 1.5, '640']) {
    const invalid = { ...data, nodes: [{ ...node, thumbnail: { ...node.thumbnail, width } }] };
    assert.throws(() => parseData(JSON.stringify(invalid)), { message: 'Saved thumbnail data is invalid.' });
  }
});
test('automatic thumbnails do not create conflicts with another browser editing file metadata', () => {
  const node = { id: 'n', kind: 'file', name: 'Original', content: 'cloud-file:original' };
  const room = (file) => ({ ...emptyData, nodes: [file] });
  const thumbnail = { source: node.content, content: 'cloud-file:thumb', width: 640, height: 320 };
  const merged = mergeRoom(room(node), room({ ...node, thumbnail }), room({ ...node, name: 'Renamed' }));
  assert.equal(merged.nodes[0].name, 'Renamed');
  assert.deepEqual(merged.nodes[0].thumbnail, thumbnail);
  const changed = mergeRoom(room(node), room({ ...node, thumbnail }), room({ ...node, content: 'cloud-file:new' }));
  assert.equal(changed.nodes[0].thumbnail, undefined);
});
