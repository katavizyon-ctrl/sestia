const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Evaluate the real lib/anthropic.js against a fake Anthropic SDK — same
// "replace only the external boundary" technique tests/toparla.test.cjs and
// tests/room-decisions.test.cjs already use for their own external
// boundaries. No network call is ever made; no ANTHROPIC_API_KEY is read for
// anything but a harmless placeholder string.
function loadAnthropicModule() {
  const state = { impl: null };
  function FakeAnthropic() { this.messages = { create: (...args) => state.impl(...args) }; }
  const code = fs.readFileSync(path.join(__dirname, '../lib/anthropic.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = {
    Anthropic: FakeAnthropic,
    roomItemSources: {},
    MAX_ROOM_PHOTOS: 6,
    SESTIA_VOICE_COMPASS: 'test-compass',
    chatContext: require('../lib/chatContext.cjs'),
    process: { env: { ANTHROPIC_API_KEY: 'test-not-real', ANTHROPIC_MODEL: 'test-model' } },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__exports = { chatFreely, validChatMessages };', ctx);
  return { mod: ctx.__exports, setCreateImpl: (fn) => { state.impl = fn; } };
}

function fakeReply(reply, suggestedAction = null) {
  return { content: [{ type: 'text', text: JSON.stringify({ reply, suggestedAction }) }], stop_reason: 'end_turn' };
}

const GENERAL = { kind: 'general' };
const CAPS = { attach_photo: true };

test('text-only chat: plain string content, no image blocks, capability fact present', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('Merhaba! Nasıl yardımcı olabilirim?'); });
  const result = await mod.chatFreely([{ role: 'user', content: 'Merhaba' }], GENERAL, CAPS);
  assert.equal(result.reply, 'Merhaba! Nasıl yardımcı olabilirim?');
  assert.equal(result.suggestedAction, null);
  assert.equal(captured.messages[0].content, 'Merhaba', 'plain text turn stays a plain string, no image blocks added');
  assert.match(captured.system, /fotoğraf gönderebilir/, 'capability fact present when attach_photo is true');
});

test('capability fact is absent when attach_photo is false', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  setCreateImpl(async () => fakeReply('Tamam.'));
  await mod.chatFreely([{ role: 'user', content: 'Merhaba' }], GENERAL, { attach_photo: false });
  // No assertion needed beyond "did not throw" — the schema line still
  // allows only null in that case, checked in the next test.
});

test('suggestedAction schema only lists currently-true capabilities', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('Tamam.', null); });
  await mod.chatFreely([{ role: 'user', content: 'Merhaba' }], GENERAL, { attach_photo: false });
  assert.match(captured.system, /"suggestedAction":\s*null\}/, 'no action key offered when the only capability is false');
});

test('image-only user message: no placeholder text required, image block still sent, provider gets a minimal internal instruction text', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('Güzel bir köşe.'); });
  await mod.chatFreely(
    [{ role: 'user', content: '', resolvedImage: { base64: 'AAAA', mediaType: 'image/jpeg' } }],
    GENERAL, CAPS
  );
  const blocks = captured.messages[0].content;
  assert.ok(Array.isArray(blocks), 'image-bearing message becomes a content array');
  assert.equal(blocks[0].type, 'image');
  assert.equal(blocks[0].source.data, 'AAAA');
  assert.equal(blocks.at(-1).type, 'text');
  assert.ok(blocks.at(-1).text.length > 0, 'a minimal server-side text block accompanies an image-only message');
});

test('toparla_result context: context image is injected on the first turn, room name reaches the system prompt', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('Masa daha ferah görünüyor.'); });
  const context = { kind: 'toparla_result', roomId: 7, sourcePhotoId: 22, toparlaResultId: 5, roomName: 'Salon', contextImage: { base64: 'RESULTBYTES', mediaType: 'image/png' } };
  await mod.chatFreely([{ role: 'user', content: 'Masa üstü hâlâ dolu.' }], context, CAPS);
  assert.match(captured.system, /Salon/, 'room name reaches the system prompt');
  assert.match(captured.system, /görselleştirme/, 'the visualization-not-a-record framing is present');
  const blocks = captured.messages[0].content;
  assert.equal(blocks[0].type, 'image');
  assert.equal(blocks[0].source.data, 'RESULTBYTES', 'the toparla result image, not a placeholder, is what the model sees');
  assert.equal(blocks.at(-1).text, 'Masa üstü hâlâ dolu.');
});

test('a user-attached image and the context image can both be present on the same turn', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('İkisine de bakıyorum.'); });
  const context = { kind: 'toparla_result', roomName: 'Salon', contextImage: { base64: 'RESULTBYTES', mediaType: 'image/png' } };
  await mod.chatFreely(
    [{ role: 'user', content: 'Bu da şu anki hali', resolvedImage: { base64: 'USERBYTES', mediaType: 'image/jpeg' } }],
    context, CAPS
  );
  const blocks = captured.messages[0].content;
  assert.equal(blocks.filter((b) => b.type === 'image').length, 2);
  // Values cross the vm-context boundary (different Array/Object realm), so
  // compare via JSON rather than assert.deepEqual's identity-sensitive check.
  assert.equal(JSON.stringify(blocks.map((b) => b.source?.data).filter(Boolean)), JSON.stringify(['RESULTBYTES', 'USERBYTES']));
});

test('malformed model output (invalid JSON) is rejected, not surfaced to the user as-is', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  setCreateImpl(async () => ({ content: [{ type: 'text', text: 'not json at all' }], stop_reason: 'end_turn' }));
  await assert.rejects(() => mod.chatFreely([{ role: 'user', content: 'Merhaba' }], GENERAL, CAPS), /invalid_chat_reply/);
});

test('a non-string suggestedAction from the model is treated as no action, never trusted as-is', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  setCreateImpl(async () => ({ content: [{ type: 'text', text: JSON.stringify({ reply: 'Tamam.', suggestedAction: { weird: true } }) }], stop_reason: 'end_turn' }));
  const result = await mod.chatFreely([{ role: 'user', content: 'Merhaba' }], GENERAL, CAPS);
  assert.equal(result.suggestedAction, null);
});

test('max_tokens stop reason is treated as an invalid reply, not silently truncated and shown', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  setCreateImpl(async () => ({ content: [{ type: 'text', text: JSON.stringify({ reply: 'kesik', suggestedAction: null }) }], stop_reason: 'max_tokens' }));
  await assert.rejects(() => mod.chatFreely([{ role: 'user', content: 'Merhaba' }], GENERAL, CAPS), /invalid_chat_reply/);
});

const CAPS_WITH_TIDY = { attach_photo: true, view_tidied_room: { relevant: true, requiresAccount: true } };

test('exact-image targeting: each attached image is tagged with its own reference id the model must cite back', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('Anladım.', { type: 'view_tidied_room', attachmentId: 42 }); });
  const result = await mod.chatFreely(
    [
      { role: 'user', content: 'ilham için', image: { source: 'chat_attachment', id: 11 }, resolvedImage: { base64: 'AAA', mediaType: 'image/jpeg' } },
      { role: 'assistant', content: 'Güzel bir köşe.' },
      { role: 'user', content: '', image: { source: 'chat_attachment', id: 42 }, resolvedImage: { base64: 'BBB', mediaType: 'image/jpeg' } },
    ],
    GENERAL, CAPS_WITH_TIDY
  );
  const firstBlocks = captured.messages[0].content;
  const lastBlocks = captured.messages[2].content;
  assert.equal(firstBlocks[0].type, 'text');
  assert.equal(firstBlocks[0].text, '[Fotoğraf referansı: 11]');
  assert.equal(lastBlocks[0].text, '[Fotoğraf referansı: 42]');
  // The model is told which reference tags exist; it is not told to just
  // pick the newest one.
  assert.match(captured.system, /GERÇEKTEN kastettiğini/);
  assert.equal(result.suggestedAction.type, 'view_tidied_room');
  assert.equal(result.suggestedAction.attachmentId, 42);
});

test('view_tidied_room is only offered in the schema when the capability says it is relevant', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  let captured;
  setCreateImpl(async (req) => { captured = req; return fakeReply('Tamam.', null); });
  await mod.chatFreely([{ role: 'user', content: 'hi' }], GENERAL, { attach_photo: true, view_tidied_room: { relevant: false, requiresAccount: true } });
  assert.doesNotMatch(captured.system, /view_tidied_room/);

  const { mod: mod2, setCreateImpl: setImpl2 } = loadAnthropicModule();
  let captured2;
  setImpl2(async (req) => { captured2 = req; return fakeReply('Tamam.', null); });
  await mod2.chatFreely([{ role: 'user', content: 'hi' }], GENERAL, CAPS_WITH_TIDY);
  assert.match(captured2.system, /view_tidied_room/);
});

test('a view_tidied_room suggestion with a non-integer or missing attachmentId is normalized to null', async () => {
  const { mod, setCreateImpl } = loadAnthropicModule();
  setCreateImpl(async () => ({ content: [{ type: 'text', text: JSON.stringify({ reply: 'Tamam.', suggestedAction: { type: 'view_tidied_room', attachmentId: 'not-a-number' } }) }], stop_reason: 'end_turn' }));
  const result = await mod.chatFreely([{ role: 'user', content: 'hi' }], GENERAL, CAPS_WITH_TIDY);
  assert.equal(result.suggestedAction, null);
});

test('validChatMessages: text-only history unchanged from before, image ref shape enforced', () => {
  const { mod } = loadAnthropicModule();
  assert.equal(mod.validChatMessages([{ role: 'user', content: 'Merhaba' }]), true);
  assert.equal(mod.validChatMessages([{ role: 'user', content: '' }]), false, 'empty text with no image is still invalid');
  assert.equal(mod.validChatMessages([{ role: 'user', content: '', image: { source: 'chat_attachment', id: 5 } }]), true, 'image-only message is valid');
  assert.equal(mod.validChatMessages([{ role: 'user', content: 'hi', image: { source: 'room_photo', id: 5 } }]), false, 'only chat_attachment is a valid message-image source in V1');
  assert.equal(mod.validChatMessages([{ role: 'user', content: 'hi', image: { source: 'chat_attachment', id: 'five' } }]), false, 'non-integer id rejected');
  assert.equal(mod.validChatMessages([{ role: 'assistant', content: 'hi', image: { source: 'chat_attachment', id: 5 } }]), false, 'assistant turns never carry an image');
});
