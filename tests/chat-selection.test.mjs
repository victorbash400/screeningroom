import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedReferences } from '../app/lib/chatSelection.ts';
import { chatHistory } from '../app/lib/agentChat.ts';
import { parseData, emptyData } from '../app/lib/storage.ts';
const nodes = [
  { id: 'folder', name: 'Films', kind: 'folder', parentId: null, workspaceId: 'w' },
  { id: 'nested', name: 'Stills', kind: 'folder', parentId: 'folder', workspaceId: 'w' },
  { id: 'image', name: 'still.png', kind: 'file', parentId: 'nested', workspaceId: 'w' },
  { id: 'document', name: 'notes.txt', kind: 'file', parentId: null, workspaceId: 'other' },
].map(node => ({ ...node, updatedAt: '2026-10-17T00:00:00Z' }));

test('multiple workspaces can be selected and selected folders include descendants only once', () => {
  assert.deepEqual(selectedReferences(['image', 'document'], nodes).map(node => node.id), ['image', 'document']);
  assert.deepEqual(selectedReferences(['folder', 'image', 'nested', 'document'], nodes).map(node => node.id), ['folder', 'document']);
  assert.equal(selectedReferences(['missing'], nodes).length, 0);
  const many = Array.from({ length: 150 }, (_, i) => ({ ...nodes[3], id: String(i) }));
  assert.equal(selectedReferences(many.map(node => node.id), many).length, 150);
});

test('selected reference identities are saved with the message and retained in subsequent model history', () => {
  const references = selectedReferences(['image', 'document'], nodes).map(({ id, name, kind, workspaceId }) => ({ id, name, kind, workspaceId }));
  const message = { id: 'm', role: 'user', text: 'Compare these', references, createdAt: '2026-10-17T00:00:00Z' };
  const data = { ...emptyData, workspaces: [{ id: 'w', name: 'Films' }, { id: 'other', name: 'Notes' }], nodes,
    conversations: [{ id: 'c', workspaceId: 'w', title: 'Chats', draft: '', messages: [message] }] };
  const saved = parseData(JSON.stringify(data));
  assert.deepEqual(saved.conversations[0].messages[0].references, references);
  const history = chatHistory(saved.conversations[0].messages);
  assert.ok(history[0].content.includes('still.png'));
  assert.ok(history[0].content.includes('notes.txt'));
  const deleted = { ...data, nodes: [] };
  assert.deepEqual(parseData(JSON.stringify(deleted)).conversations[0].messages[0].references, references);
  const wrong = structuredClone(data);
  wrong.conversations[0].messages[0].references[0].workspaceId = 'other';
  assert.throws(() => parseData(JSON.stringify(wrong)), { message: 'Saved message data is invalid.' });
});
