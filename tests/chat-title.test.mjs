import assert from 'node:assert/strict';
import test from 'node:test';
import { chatTitleSchema, canNameChat, isFirstChatReply } from '../app/lib/chatTitle.ts';

const user = { id: 'u', role: 'user', text: 'Find science fiction films' };
const reply = { id: 'a', role: 'assistant', status: 'complete', text: 'Try Arrival.' };
const conversation = { id: 'c', title: 'New chat', messages: [user, reply] };

test('naming starts only after the first successful main-chat reply', () => {
  assert.equal(isFirstChatReply([user], reply), true);
  assert.equal(isFirstChatReply([user, reply, user], reply), false);
  for (const status of ['streaming', 'failed', 'stopped'])
    assert.equal(isFirstChatReply([user], { ...reply, status }), false);
  assert.equal(isFirstChatReply([user], { ...reply, replyToId: 'thread' }), false);
});

test('a late title cannot overwrite a manual name or rename another chat', () => {
  assert.equal(canNameChat(conversation, 'u'), true);
  assert.equal(canNameChat({ ...conversation, title: 'My films' }, 'u'), false);
  assert.equal(canNameChat(conversation, 'other'), false);
  assert.equal(canNameChat({ ...conversation, scope: 'workspace' }, 'u'), false);
});

test('structured titles contain at most six actual words without parsing model prose', () => {
  assert.equal(chatTitleSchema.parse({ title: ' Science Fiction Films ' }).title, 'Science Fiction Films');
  assert.equal(chatTitleSchema.safeParse({ title: 'one two three four five six' }).success, true);
  assert.equal(chatTitleSchema.safeParse({ title: 'one\ttwo\nthree four five six seven' }).success, false);
  for (const title of ['', '   ', 'one two three four five six seven', '...'])
    assert.equal(chatTitleSchema.safeParse({ title }).success, false);
});
