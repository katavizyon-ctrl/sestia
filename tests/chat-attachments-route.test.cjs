const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');

// Same technique as tests/toparla.test.cjs — evaluate the real lib/db.js
// schema/functions against an isolated connection. No import of lib/db.js
// (which would open the user's real database) happens.
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
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.api={chatAttachments};', ctx);
  return ctx.api;
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-chat-attach-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-chat-attach-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return { db, api, directory };
}

function FakeNextResponse(body, init) { this.body = body; this.status = init?.status ?? 200; this.headers = init?.headers; }
FakeNextResponse.json = (body, options) => ({ body, status: options?.status ?? 200 });

function route(file, deps) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = { console, Buffer, FormData, Blob, NextResponse: FakeNextResponse, ...deps };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__h={POST:typeof POST!=="undefined"?POST:undefined,GET:typeof GET!=="undefined"?GET:undefined};', ctx);
  return ctx.__h;
}

function postRoute(f, owner = 'owner') {
  const { POST } = route('app/api/chat/attachments/route.js', {
    fs: require('fs/promises'), path, crypto: require('crypto'),
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner } : null),
    chatAttachments: f.api.chatAttachments,
    MAX_UPLOAD_BYTES: 20 * 1024 * 1024,
  });
  return (formData) => POST({ formData: async () => formData });
}

function getRoute(f, owner = 'owner') {
  const { GET } = route('app/api/chat/attachments/[attachmentId]/route.js', {
    fs: require('fs/promises'), path,
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner } : null),
    chatAttachments: f.api.chatAttachments,
  });
  return (attachmentId) => GET({}, { params: Promise.resolve({ attachmentId: String(attachmentId) }) });
}

test('supported image upload succeeds and is retrievable by its owner', async t => {
  const f = fixture(t);
  const fd = new FormData();
  fd.append('photo', new Blob(['hello-bytes'], { type: 'image/jpeg' }), 'x.jpg');
  const res = await postRoute(f)(fd);
  assert.equal(res.status, 200);
  assert.ok(Number.isInteger(res.body.id));

  const got = await getRoute(f, 'owner')(res.body.id);
  assert.equal(got.status, 200);
  assert.equal(got.body.toString(), 'hello-bytes');
  assert.equal(got.headers['Content-Type'], 'image/jpeg');
});

test('unsupported MIME type is rejected, nothing written', async t => {
  const f = fixture(t);
  const fd = new FormData();
  fd.append('photo', new Blob(['not an image'], { type: 'application/pdf' }), 'x.pdf');
  const res = await postRoute(f)(fd);
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'unsupported_type');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM chat_attachments').get().n, 0);
});

test('oversize upload is rejected', async t => {
  const f = fixture(t);
  const { POST } = route('app/api/chat/attachments/route.js', {
    fs: require('fs/promises'), path, crypto: require('crypto'),
    process: { cwd: () => f.directory },
    getIdentity: async () => ({ id: 'owner' }),
    chatAttachments: f.api.chatAttachments,
    MAX_UPLOAD_BYTES: 4, // tiny cap for the test
  });
  const fd = new FormData();
  fd.append('photo', new Blob(['too-big-bytes'], { type: 'image/jpeg' }), 'x.jpg');
  const res = await POST({ formData: async () => fd });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'file_too_large');
});

test('ownership: another identity cannot read someone else\'s attachment', async t => {
  const f = fixture(t);
  const fd = new FormData();
  fd.append('photo', new Blob(['secret-bytes'], { type: 'image/png' }), 'x.png');
  const uploaded = await postRoute(f, 'owner')(fd);
  const stranger = await getRoute(f, 'stranger')(uploaded.body.id);
  assert.equal(stranger.status, 404);
  const unauthenticated = await getRoute(f, null)(uploaded.body.id);
  assert.equal(unauthenticated.status, 401);
});

test('upload requires identity', async t => {
  const f = fixture(t);
  const fd = new FormData();
  fd.append('photo', new Blob(['bytes'], { type: 'image/jpeg' }), 'x.jpg');
  const res = await postRoute(f, null)(fd);
  assert.equal(res.status, 401);
});
