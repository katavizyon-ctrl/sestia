const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const openaiImage = require('../lib/openaiImage.cjs');

// Evaluate the real lib/db.js schema/functions against an isolated
// connection — same technique as tests/room-decisions.test.cjs:loadApi. No
// import of lib/db.js (which would open the user's real database) happens.
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
    chatAttachmentStore: require('../lib/chatAttachmentStore.cjs'),
    sessionStoreModule: require('../lib/sessionStore.cjs'),
    visitMetadataStoreModule: require('../lib/visitMetadataStore.cjs'),
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.api={createRoom,creations,toparla,addRoomPhoto,getRoomDetail};', ctx);
  return ctx.api;
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-toparla-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-toparla-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const room = api.createRoom('owner', 'Salon');
  const photo = api.creations.photo('owner', room.id, 'seed-photo', Buffer.from('fake-jpeg-bytes'), 'image/jpeg');
  return { db, api, directory, roomId: room.id, photoId: photo.id };
}

// Supports both NextResponse.json(...) and `new NextResponse(bytes, init)`
// (the raw-bytes photo/result serving routes use the latter).
function FakeNextResponse(body, init) { this.body = body; this.status = init?.status ?? 200; this.headers = init?.headers; }
FakeNextResponse.json = (body, options) => ({ body, status: options?.status ?? 200 });

// Loads a real app/api route file, with only its imports replaced.
function route(file, deps) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = {
    console, Buffer, FormData, Blob, fetch: global.fetch,
    NextResponse: FakeNextResponse,
    ...deps,
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__h={POST:typeof POST!=="undefined"?POST:undefined,GET:typeof GET!=="undefined"?GET:undefined};', ctx);
  return ctx.__h;
}

function postRoute(f, owner = 'owner', identityType = 'account') {
  const { POST } = route('app/api/rooms/[id]/toparla/route.js', {
    fs: require('fs/promises'), path, crypto: require('crypto'),
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner, type: identityType } : null),
    isAccountIdentity: (identity) => identity?.type === 'account',
    toparla: f.api.toparla,
    openaiImage,
  });
  return (roomId, body) => POST({ json: async () => body }, { params: Promise.resolve({ id: String(roomId) }) });
}

function getRoute(f, owner = 'owner') {
  const { GET } = route('app/api/rooms/[id]/toparla/[resultId]/route.js', {
    fs: require('fs/promises'), path,
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner } : null),
    toparla: f.api.toparla,
  });
  return (roomId, resultId) => GET({}, { params: Promise.resolve({ id: String(roomId), resultId: String(resultId) }) });
}

function withMockedGeneration(impl, fn) {
  const original = openaiImage.generateTidyImage;
  let calls = 0;
  openaiImage.generateTidyImage = async (...args) => { calls += 1; return impl(...args); };
  return Promise.resolve(fn(() => calls)).finally(() => { openaiImage.generateTidyImage = original; });
}

test('account gate: a guest identity is rejected before any claim or paid call, even for a room/photo it legitimately owns', async t => {
  const f = fixture(t);
  const guestPost = postRoute(f, 'owner', 'guest');
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const res = await guestPost(f.roomId, { photoId: f.photoId, operationKey: 'op-guest-000001' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'account_required');
    assert.equal(calls(), 0, 'a guest must never reach the paid generation call');
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM toparla_results').get().n, 0, 'no claim/row is created for a rejected guest request');
  });
});

test('ownership: cannot generate for a room or photo you do not own', async t => {
  const f = fixture(t), post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const wrongRoom = await post(999999, { photoId: f.photoId, operationKey: 'op-wrong-room1' });
    assert.equal(wrongRoom.status, 404);
    const wrongDevice = await postRoute(f, 'stranger')(f.roomId, { photoId: f.photoId, operationKey: 'op-stranger-01' });
    assert.equal(wrongDevice.status, 404);
    const foreignPhoto = await post(f.roomId, { photoId: 999999, operationKey: 'op-badphoto1' });
    assert.equal(foreignPhoto.status, 404);
    assert.equal(calls(), 0, 'no paid call for any rejected ownership check');
  });
});

test('happy path: exactly one paid call, persisted with owner/room/source/model/quality/dims, never in room_photos', async t => {
  const f = fixture(t), post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('fake-png-bytes'), latencyMs: 5, usage: { total_tokens: 10 } }), async (calls) => {
    const res = await post(f.roomId, { photoId: f.photoId, operationKey: 'op-happy-0001' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'completed');
    assert.equal(calls(), 1);

    const row = f.db.prepare('SELECT * FROM toparla_results WHERE id = ?').get(res.body.id);
    assert.equal(row.device_id, 'owner');
    assert.equal(row.room_id, f.roomId);
    assert.equal(row.source_photo_id, f.photoId);
    assert.equal(row.model, 'gpt-image-2.5-sunburst');
    assert.equal(row.quality, 'medium');
    assert.ok(row.output_width > 0 && row.output_height > 0);
    assert.ok(row.filename);
    assert.ok(row.created_at);

    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_photos').get().n, 1, 'the generated image must not become a room photo');
    const bytes = fs.readFileSync(path.join(f.directory, 'data', 'toparla-results', row.filename));
    assert.equal(bytes.toString(), 'fake-png-bytes');
  });
});

test('duplicate submission after success replays the same result with no second paid call', async t => {
  const f = fixture(t), post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    const first = await post(f.roomId, { photoId: f.photoId, operationKey: 'op-dup-00001' });
    const second = await post(f.roomId, { photoId: f.photoId, operationKey: 'op-dup-00001' });
    assert.equal(second.status, 200);
    assert.equal(second.body.id, first.body.id);
    assert.equal(calls(), 1, 'a duplicate tap/retry must never trigger a second paid call');
  });
});

test('the same operation key reused for a different photo is rejected, not silently regenerated', async t => {
  const f = fixture(t), post = postRoute(f);
  const otherPhoto = f.api.creations.photo('owner', f.roomId, 'seed-photo-2', Buffer.from('other'), 'image/jpeg');
  await withMockedGeneration(async () => ({ bytes: Buffer.from('png'), latencyMs: 1, usage: null }), async (calls) => {
    await post(f.roomId, { photoId: f.photoId, operationKey: 'op-reuse-0001' });
    const conflict = await post(f.roomId, { photoId: otherPhoto.id, operationKey: 'op-reuse-0001' });
    assert.equal(conflict.status, 409);
    assert.equal(calls(), 1);
  });
});

test('a failed generation is recorded, not retried automatically, and never fakes success', async t => {
  const f = fixture(t), post = postRoute(f);
  await withMockedGeneration(async () => { throw new openaiImage.OpenAIImageError('api_error', 'boom'); }, async (calls) => {
    const failed = await post(f.roomId, { photoId: f.photoId, operationKey: 'op-fail-00001' });
    assert.equal(failed.status, 502);
    const row = f.db.prepare('SELECT * FROM toparla_results WHERE operation_key = ?').get('op-fail-00001');
    assert.equal(row.status, 'failed');
    assert.equal(row.filename, null);

    // Resubmitting the exact same operation key must not call OpenAI again.
    const again = await post(f.roomId, { photoId: f.photoId, operationKey: 'op-fail-00001' });
    assert.equal(again.body.status, 'failed');
    assert.equal(calls(), 1, 'no automatic retry of a failed paid request');
  });
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_photos').get().n, 1, 'a failure must not corrupt the room');
});

test('result bytes are served only to the owner and only once completed', async t => {
  const f = fixture(t), post = postRoute(f);
  await withMockedGeneration(async () => ({ bytes: Buffer.from('the-image'), latencyMs: 1, usage: null }), async () => {
    const created = await post(f.roomId, { photoId: f.photoId, operationKey: 'op-serve-0001' });
    const ok = await getRoute(f, 'owner')(f.roomId, created.body.id);
    assert.equal(ok.status, 200);

    const stranger = await getRoute(f, 'stranger')(f.roomId, created.body.id);
    assert.equal(stranger.status, 404);
  });

  await withMockedGeneration(async () => { throw new openaiImage.OpenAIImageError('api_error', 'boom'); }, async () => {
    await post(f.roomId, { photoId: f.photoId, operationKey: 'op-serve-fail1' });
    const failedRow = f.db.prepare("SELECT id FROM toparla_results WHERE operation_key = 'op-serve-fail1'").get();
    const res = await getRoute(f, 'owner')(f.roomId, failedRow.id);
    assert.equal(res.status, 404, 'a failed result has no bytes to serve');
  });
});
