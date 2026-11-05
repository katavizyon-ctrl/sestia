// "Oda Planı": the room blueprint store and its API route, on the real
// lib/db.js against an isolated database (same technique as
// tests/room-suggestion-ideas.test.cjs), never the user's real database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const validation = require('../lib/blueprintValidation.cjs');

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
  vm.runInContext(code + ';globalThis.api={createRoom,getRoomBlueprint,putRoomBlueprint};', ctx);
  return ctx.api;
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-blueprint-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-blueprint-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const room = api.createRoom('owner', 'Salon');
  return { db, api, roomId: room.id };
}

const ROUTE = 'app/api/rooms/[id]/blueprint/route.js';
const FakeNextResponse = { json: (body, options) => ({ body, status: options?.status ?? 200 }) };
function loadRoute(f, { owner = 'owner' } = {}) {
  const code = fs.readFileSync(path.join(__dirname, '..', ROUTE), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = {
    Buffer, NextResponse: FakeNextResponse, validation,
    getIdentity: async () => (owner ? { id: owner } : null),
    getRoomBlueprint: f.api.getRoomBlueprint, putRoomBlueprint: f.api.putRoomBlueprint,
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__route = { GET, PUT };', ctx);
  return ctx.__route;
}
const params = (id) => ({ params: Promise.resolve({ id: String(id) }) });
const request = (body, { type = 'application/json', length } = {}) => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Map([['content-type', type], ['content-length', String(length ?? Buffer.byteLength(text))]]);
  return { headers: { get: (k) => headers.get(k.toLowerCase()) ?? null }, text: async () => text };
};
const plain = (v) => JSON.parse(JSON.stringify(v));

const L_ROOM = () => ({
  walls: [
    { id: 1, a: { x: 150, y: 110 }, b: { x: 750, y: 110 }, thickness: 12 },
    { id: 2, a: { x: 750, y: 110 }, b: { x: 750, y: 330 }, thickness: 12 },
  ],
  openings: [
    { id: 3, wall: 1, t: 0.5, type: 'window', width: 120 },
    { id: 4, wall: 2, t: 0.4, type: 'door', width: 85 },
  ],
  next: 5,
});

// ---------------- validation ----------------

test('blueprint validation: an opening must sit on a wall, not on another opening', () => {
  const m = L_ROOM();
  m.openings[1].wall = 3;
  assert.equal(validation.validBlueprint(m), false);
});

test('blueprint validation: walls thicker than 2 m or a non-object wall are refused', () => {
  const thick = L_ROOM(); thick.walls[0].thickness = 201;
  assert.equal(validation.validBlueprint(thick), false);
  const odd = L_ROOM(); odd.walls[0] = 'wall';
  assert.equal(validation.validBlueprint(odd), false);
});

test('blueprint validation: only the fields the editor knows are kept', () => {
  const m = L_ROOM();
  m.walls[0].note = 'x'.repeat(50);
  m.extra = { anything: true };
  const kept = validation.normalizeBlueprint(m);
  assert.deepEqual(Object.keys(kept), ['walls', 'openings', 'next']);
  assert.equal(kept.walls[0].note, undefined);
  assert.deepEqual(kept.walls[1], L_ROOM().walls[1]);
});

// ---------------- store ----------------

test('blueprint store: a new room starts empty; a saved plan comes back exactly', t => {
  const f = fixture(t);
  assert.deepEqual(plain(f.api.getRoomBlueprint(f.roomId, 'owner')), { model: { walls: [], openings: [], next: 1 }, schemaVersion: 1, updatedAt: null });
  const saved = f.api.putRoomBlueprint(f.roomId, 'owner', L_ROOM());
  assert.ok(saved.updatedAt);
  const back = f.api.getRoomBlueprint(f.roomId, 'owner');
  assert.deepEqual(plain(back.model), L_ROOM());
  assert.equal(back.updatedAt, saved.updatedAt);
  const changed = L_ROOM(); changed.openings[0].width = 90;
  f.api.putRoomBlueprint(f.roomId, 'owner', changed);
  assert.equal(f.api.getRoomBlueprint(f.roomId, 'owner').model.openings[0].width, 90, 'the newest save replaces the old one');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM room_blueprints').get().n, 1);
});

test('blueprint store: each room has its own plan, and nobody else can read or write it', t => {
  const f = fixture(t);
  const kitchen = f.api.createRoom('owner', 'Mutfak');
  f.api.putRoomBlueprint(f.roomId, 'owner', L_ROOM());
  assert.equal(f.api.getRoomBlueprint(kitchen.id, 'owner').updatedAt, null, 'the other room is untouched');
  assert.equal(f.api.getRoomBlueprint(f.roomId, 'stranger'), null);
  assert.equal(f.api.putRoomBlueprint(f.roomId, 'stranger', { walls: [], openings: [], next: 1 }), null);
  assert.equal(f.api.getRoomBlueprint(f.roomId, 'owner').model.walls.length, 2, 'the stranger wrote nothing');
  assert.equal(f.api.getRoomBlueprint(9999, 'owner'), null, 'a room that does not exist');
});

// ---------------- route ----------------

test('blueprint route: save, then load the same geometry', async t => {
  const f = fixture(t);
  const route = loadRoute(f);
  const put = await route.PUT(request({ model: L_ROOM() }), params(f.roomId));
  assert.equal(put.status, 200);
  assert.equal(put.body.ok, true);
  const get = await route.GET({}, params(f.roomId));
  assert.equal(get.status, 200);
  assert.deepEqual(plain(get.body.model), L_ROOM());
});

test('blueprint route: signed out is 401; a stranger\'s or a missing room is 404, with nothing written', async t => {
  const f = fixture(t);
  assert.equal((await loadRoute(f, { owner: null }).GET({}, params(f.roomId))).status, 401);
  assert.equal((await loadRoute(f, { owner: null }).PUT(request({ model: L_ROOM() }), params(f.roomId))).status, 401);
  const stranger = loadRoute(f, { owner: 'stranger' });
  assert.equal((await stranger.GET({}, params(f.roomId))).status, 404);
  assert.equal((await stranger.PUT(request({ model: L_ROOM() }), params(f.roomId))).status, 404);
  assert.equal((await loadRoute(f).PUT(request({ model: L_ROOM() }), params(9999))).status, 404);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM room_blueprints').get().n, 0);
});

test('blueprint route: odd room ids, non-JSON bodies, bad models and oversize bodies are refused', async t => {
  const f = fixture(t);
  const route = loadRoute(f);
  for (const id of ['0', '-1', '1.5', '1e3', 'abc', '01']) {
    assert.equal((await route.GET({}, params(id))).status, 400, `room id ${id}`);
  }
  assert.equal((await route.PUT(request({ model: L_ROOM() }, { type: 'text/plain' }), params(f.roomId))).status, 415);
  assert.equal((await route.PUT(request('{not json'), params(f.roomId))).status, 400);
  assert.equal((await route.PUT(request({ model: { walls: 'x', openings: [], next: 1 } }), params(f.roomId))).status, 400);
  assert.equal((await route.PUT(request(null), params(f.roomId))).status, 400);
  const big = 'x'.repeat(validation.MAX_BLUEPRINT_BYTES + 1);
  assert.equal((await route.PUT(request(big), params(f.roomId))).status, 413, 'measured body');
  assert.equal((await route.PUT(request({ model: L_ROOM() }, { length: validation.MAX_BLUEPRINT_BYTES + 1 }), params(f.roomId))).status, 413, 'declared length');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM room_blueprints').get().n, 0);
});

test('blueprint route: extra fields a client sends are not stored', async t => {
  const f = fixture(t);
  const model = L_ROOM();
  model.walls[0].script = '<img onerror=alert(1)>';
  await loadRoute(f).PUT(request({ model }), params(f.roomId));
  const stored = f.db.prepare('SELECT model_json FROM room_blueprints').get().model_json;
  assert.ok(!stored.includes('script'));
});
