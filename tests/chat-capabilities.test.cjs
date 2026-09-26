const test = require('node:test');
const assert = require('node:assert/strict');
const chatCapabilities = require('../lib/chatCapabilities.cjs');

test('getCapabilities: attach_photo is available in V1, returns a fresh copy each time', () => {
  const a = chatCapabilities.getCapabilities();
  assert.equal(a.attach_photo, true);
  a.attach_photo = false; // mutating the returned object must not affect the source of truth
  assert.equal(chatCapabilities.getCapabilities().attach_photo, true);
});

test('isSuggestedActionValid: null is always fine; only a currently-true capability key is valid', () => {
  const caps = chatCapabilities.getCapabilities();
  assert.equal(chatCapabilities.isSuggestedActionValid(null, caps), true);
  assert.equal(chatCapabilities.isSuggestedActionValid(undefined, caps), true);
  assert.equal(chatCapabilities.isSuggestedActionValid('attach_photo', caps), true);
  assert.equal(chatCapabilities.isSuggestedActionValid('save_to_room', caps), false, 'not implemented, must never validate');
  assert.equal(chatCapabilities.isSuggestedActionValid('create_reminder', caps), false);
  assert.equal(chatCapabilities.isSuggestedActionValid(42, caps), false, 'non-string is never valid');
  assert.equal(chatCapabilities.isSuggestedActionValid({ weird: true }, caps), false);
});

test('isSuggestedActionValid: a capability that is false rejects its own key', () => {
  assert.equal(chatCapabilities.isSuggestedActionValid('attach_photo', { attach_photo: false }), false);
});

test('getCapabilities: view_tidied_room separates relevance from account authorization', () => {
  assert.deepEqual(chatCapabilities.getCapabilities(), { attach_photo: true, view_tidied_room: { relevant: false, requiresAccount: true } });
  assert.deepEqual(chatCapabilities.getCapabilities({ hasAttachableImage: true }).view_tidied_room, { relevant: true, requiresAccount: true });
  assert.equal(chatCapabilities.getCapabilities({ hasAttachableImage: false }).view_tidied_room.relevant, false);
});

test('isSuggestedActionValid: view_tidied_room requires relevance AND a real integer attachment id, never account status', () => {
  const relevant = chatCapabilities.getCapabilities({ hasAttachableImage: true });
  const notRelevant = chatCapabilities.getCapabilities({ hasAttachableImage: false });
  assert.equal(chatCapabilities.isSuggestedActionValid({ type: 'view_tidied_room', attachmentId: 7 }, relevant), true);
  assert.equal(chatCapabilities.isSuggestedActionValid({ type: 'view_tidied_room', attachmentId: 7 }, notRelevant), false, 'no usable image -> never valid, regardless of shape');
  assert.equal(chatCapabilities.isSuggestedActionValid({ type: 'view_tidied_room' }, relevant), false, 'missing attachmentId is invalid');
  assert.equal(chatCapabilities.isSuggestedActionValid({ type: 'view_tidied_room', attachmentId: 'seven' }, relevant), false, 'non-integer id is invalid');
  assert.equal(chatCapabilities.isSuggestedActionValid({ type: 'invented_action', attachmentId: 7 }, relevant), false, 'unknown action type is always invalid');
});
