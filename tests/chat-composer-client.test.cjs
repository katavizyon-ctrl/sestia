const test = require('node:test');
const assert = require('node:assert/strict');
const chatComposerClient = require('../lib/chatComposerClient.cjs');

test('canSend: requires text or a file, never sends on selection alone', () => {
  assert.equal(chatComposerClient.canSend({ text: '', file: null, busy: false, messageCount: 0 }), false);
  assert.equal(chatComposerClient.canSend({ text: '   ', file: null, busy: false, messageCount: 0 }), false, 'whitespace-only text does not count');
  assert.equal(chatComposerClient.canSend({ text: 'merhaba', file: null, busy: false, messageCount: 0 }), true);
  assert.equal(chatComposerClient.canSend({ text: '', file: { type: 'image/jpeg' }, busy: false, messageCount: 0 }), true, 'image-only is valid');
});

test('canSend: double-send / limit guards', () => {
  assert.equal(chatComposerClient.canSend({ text: 'hi', file: null, busy: true, messageCount: 0 }), false, 'a request already in flight blocks a second send');
  assert.equal(chatComposerClient.canSend({ text: 'hi', file: null, busy: false, messageCount: 41 }), false, 'at the turn cap, sending is blocked');
  assert.equal(chatComposerClient.canSend({ text: 'hi', file: null, busy: false, messageCount: 40 }), true);
});

test('isSupportedAttachment: MIME allowlist and size cap', () => {
  assert.equal(chatComposerClient.isSupportedAttachment({ type: 'image/jpeg', size: 100 }, 1000), true);
  assert.equal(chatComposerClient.isSupportedAttachment({ type: 'image/png', size: 100 }, 1000), true);
  assert.equal(chatComposerClient.isSupportedAttachment({ type: 'image/webp', size: 100 }, 1000), true);
  assert.equal(chatComposerClient.isSupportedAttachment({ type: 'application/pdf', size: 100 }, 1000), false, 'unsupported MIME rejected');
  assert.equal(chatComposerClient.isSupportedAttachment({ type: 'image/jpeg', size: 1001 }, 1000), false, 'oversize rejected');
  assert.equal(chatComposerClient.isSupportedAttachment(null, 1000), false);
});

test('buildUserMessage: image-only never invents placeholder text client-side', () => {
  assert.deepEqual(chatComposerClient.buildUserMessage('', { source: 'chat_attachment', id: 5 }), { role: 'user', content: '', image: { source: 'chat_attachment', id: 5 } });
  assert.deepEqual(chatComposerClient.buildUserMessage('  merhaba  ', undefined), { role: 'user', content: 'merhaba' });
});

test('isRenderableAction: only the known V1 action renders, no arbitrary strings', () => {
  assert.equal(chatComposerClient.isRenderableAction('attach_photo'), true);
  assert.equal(chatComposerClient.isRenderableAction('save_to_room'), false, 'unimplemented action never renders');
  assert.equal(chatComposerClient.isRenderableAction('anything_the_model_might_invent'), false);
  assert.equal(chatComposerClient.isRenderableAction(null), false);
  assert.equal(chatComposerClient.isRenderableAction(undefined), false);
});
