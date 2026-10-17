const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const openaiImage = require('../lib/openaiImage.cjs');

// Same technique as tests/toparla.test.cjs — evaluate the real lib/db.js
// schema/functions against an isolated connection.
function loadApi(db) {
  let code = fs.readFileSync(path.join(__dirname, '../lib/db.js'), 'utf8');
  const start = code.indexOf('const dataDir =');
  const end = code.indexOf("withBusyRetry(() => db.pragma('journal_mode = WAL'));");
  assert.ok(start > 0 && end > start, 'connection bootstrap must be explicitly replaced');
  code = code.slice(0, start) + 'const db = __testDb;\n' + code.slice(end);
  code = code.replace(/^import .*;\r?\n/gm, '').replace(/^export default db;?/gm, '').replace(/^export /gm, '');
  const ctx = {
    __testDb: db, path, process: { cwd: () => path.dirname(db.name) },
    roomDecisionStore: require('../lib/roomDecisionStore.cjs'),
    creationStore: require('../lib/creationStore.cjs'),
    toparlaStore: require('../lib/toparlaStore.cjs'),
    roomSuggestionStore: require('../lib/roomSuggestionStore.cjs'),
    chatAttachmentStore: require('../lib/chatAttachmentStore.cjs'),
    sessionStoreModule: require('../lib/sessionStore.cjs'),
    visitMetadataStoreModule: require('../lib/visitMetadataStore.cjs'),
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.api={createRoom,creations,toparla,chatAttachments};', ctx);
  return ctx.api;
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-chat-toparla-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-chat-toparla-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const attachment = api.chatAttachments.create('owner', 'chat-x.jpg', 'image/jpeg');
  fs.mkdirSync(path.join(directory, 'data', 'chat-attachments'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'data', 'chat-attachments', 'chat-x.jpg'), Buffer.from('fake-jpeg-bytes'));
  return { db, api, directory, attachmentId: attachment.id };
}

function FakeNextResponse(body, init) { this.body = body; this.status = init?.status ?? 200; this.headers = init?.headers; }
FakeNextResponse.json = (body, options) => ({ body, status: options?.status ?? 200 });

function route(file, deps) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = { console, Buffer, NextResponse: FakeNextResponse, ...deps };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__h={POST:typeof POST!=="undefined"?POST:undefined,GET:typeof GET!=="undefined"?GET:undefined};', ctx);
  return ctx.__h;
}

function postRoute(f, owner = 'owner', identityType = 'account') {
  const { POST } = route('app/api/chat/toparla/route.js', {
    fs: require('fs/promises'), path, crypto: require('crypto'),
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner, type: identityType } : null),
    isAccountIdentity: (identity) => identity?.type === 'account',
    toparla: f.api.toparla,
    openaiImage,
  });
  return (body) => POST({ json: async () => body });
}

function getRoute(f, owner = 'owner') {
  const { GET } = route('app/api/chat/toparla/[resultId]/route.js', {
    fs: require('fs/promises'), path,
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner } : null),
    toparla: f.api.toparla,
  });
  return (resultId) => GET({}, { params: Promise.resolve({ resultId: String(resultId) }) });
}

function withMockedGeneration(impl, fn) {
  const original = openaiImage.generateTidyImage;
  let calls = 0;
  openaiImage.generateTidyImage = async (...args) => { calls += 1; return impl(...args); };
  return Promise.resolve(fn(() => calls)).finally(() => { openaiImage.generateTidyImage = original; });
}

test('account gate: a guest is rejected before any claim/paid call, even for an attachment it owns', async t => {
  const f = fixture(t);
  const guestPost = postRoute(f, 'owner', 'guest');
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const res = await guestPost({ attachmentId: f.attachmentId, operationKey: 'op-guest-000001' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'account_required');
    assert.equal(calls(), 0);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM toparla_results').get().n, 0, 'no claim/row created for a rejected guest request');
  });
});

test('ownership: cannot generate for an attachment you do not own', async t => {
  const f = fixture(t);
  const strangerPost = postRoute(f, 'stranger', 'account');
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const res = await strangerPost({ attachmentId: f.attachmentId, operationKey: 'op-foreign-0001' });
    assert.equal(res.status, 404);
    assert.equal(calls(), 0);
  });
});

test('happy path: account + owned attachment -> exactly one paid call, room-less/photo-less/chat_attachment-typed row, never room_photos', async t => {
  const f = fixture(t);
  const post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('fake-png-bytes'), latencyMs: 5, usage: null }), async (calls) => {
    const res = await post({ attachmentId: f.attachmentId, operationKey: 'op-happy-attach1' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'completed');
    assert.equal(calls(), 1);

    const row = f.db.prepare('SELECT * FROM toparla_results WHERE id = ?').get(res.body.id);
    assert.equal(row.device_id, 'owner');
    assert.equal(row.source_kind, 'chat_attachment');
    assert.equal(row.chat_attachment_id, f.attachmentId);
    assert.equal(row.room_id, null, 'no room for a chat-originated result');
    assert.equal(row.source_photo_id, null, 'no room photo for a chat-originated result');
    assert.equal(row.model, 'gpt-image-2.5-sunburst');
    assert.equal(row.quality, 'medium');

    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_photos').get().n, 0, 'a chat attachment must never become a room photo');
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM rooms').get().n, 0, 'no room may be silently created');
    const bytes = fs.readFileSync(path.join(f.directory, 'data', 'toparla-results', row.filename));
    assert.equal(bytes.toString(), 'fake-png-bytes');
  });
});

test('duplicate submission after success replays the same result with no second paid call', async t => {
  const f = fixture(t);
  const post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const first = await post({ attachmentId: f.attachmentId, operationKey: 'op-dup-attach01' });
    const second = await post({ attachmentId: f.attachmentId, operationKey: 'op-dup-attach01' });
    assert.equal(second.status, 200);
    assert.equal(second.body.id, first.body.id);
    assert.equal(calls(), 1);
  });
});

test('the same operation key reused for a different attachment is rejected, not silently regenerated', async t => {
  const f = fixture(t);
  const post = postRoute(f);
  const otherAttachment = f.api.chatAttachments.create('owner', 'chat-y.jpg', 'image/jpeg');
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    await post({ attachmentId: f.attachmentId, operationKey: 'op-reuse-attach1' });
    const conflict = await post({ attachmentId: otherAttachment.id, operationKey: 'op-reuse-attach1' });
    assert.equal(conflict.status, 409);
    assert.equal(calls(), 1);
  });
});

test('the same operation key can never straddle a room_photo claim and an attachment claim', async t => {
  const f = fixture(t);
  const room = f.api.createRoom('owner', 'Salon');
  const roomPhoto = f.api.creations.photo('owner', room.id, 'seed-photo-op', Buffer.from('x'), 'image/jpeg');
  const roomClaim = f.api.toparla.claimGeneration('owner', room.id, roomPhoto.id, 'op-cross-source1', { model: 'gpt-image-2.5-sunburst', quality: 'medium' });
  assert.equal(roomClaim.justCreated, true);
  const post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const res = await post({ attachmentId: f.attachmentId, operationKey: 'op-cross-source1' });
    assert.equal(res.status, 409);
    assert.equal(calls(), 0);
  });
});

test('a failed generation is recorded, not retried automatically, and never fakes success', async t => {
  const f = fixture(t);
  const post = postRoute(f);
  await withMockedGeneration(async () => { throw new openaiImage.OpenAIImageError('api_error', 'boom'); }, async (calls) => {
    const failed = await post({ attachmentId: f.attachmentId, operationKey: 'op-fail-attach01' });
    assert.equal(failed.status, 502);
    const row = f.db.prepare('SELECT * FROM toparla_results WHERE operation_key = ?').get('op-fail-attach01');
    assert.equal(row.status, 'failed');
    assert.equal(row.filename, null);

    const again = await post({ attachmentId: f.attachmentId, operationKey: 'op-fail-attach01' });
    assert.equal(again.body.status, 'failed');
    assert.equal(calls(), 1, 'no automatic retry of a failed paid request');
  });
});

test('result bytes are served only to the owner and only once completed, via the room-less serving route', async t => {
  const f = fixture(t);
  const post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('the-image'), latencyMs: 1, usage: null }), async () => {
    const created = await post({ attachmentId: f.attachmentId, operationKey: 'op-serve-attach01' });
    const ok = await getRoute(f, 'owner')(created.body.id);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.toString(), 'the-image');

    const stranger = await getRoute(f, 'stranger')(created.body.id);
    assert.equal(stranger.status, 404);
  });
});
