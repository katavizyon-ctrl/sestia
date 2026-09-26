const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const roomDecisionStore = require('../lib/roomDecisionStore.cjs');
const sources = require('../lib/roomItemSources.cjs');
const { Worker } = require('node:worker_threads');

test('N04: room and photo lost-response retries return their original resource', t => {
  const f = fixture(t);
  const room = f.api.creations.room('owner', 'room-operation', 'Yeni Oda');
  const again = f.api.creations.room('owner', 'room-operation', 'Yeni Oda');
  assert.equal(again.id, room.id);
  const first = f.api.creations.photo('owner', room.id, 'photo-operation', Buffer.from('photo'), 'image/jpeg');
  const replay = f.api.creations.photo('owner', room.id, 'photo-operation', Buffer.from('photo'), 'image/jpeg');
  assert.equal(replay.id, first.id);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_photos').get().n, 1);
  assert.equal(fs.readdirSync(path.join(path.dirname(f.db.name), 'data', 'room-photos')).length, 1);
});

test('N04: conflicting payloads fail; keys are owner scoped and disclose no foreign resource', t => {
  const f = fixture(t), room = f.api.creations.room('owner', 'room-operation', 'Yeni Oda');
  assert.throws(() => f.api.creations.room('owner', 'room-operation', 'Different'), /operation_content_conflict/);
  const other = f.api.creations.room('stranger', 'room-operation', 'Yeni Oda');
  assert.notEqual(other.id, room.id);
  const image = Buffer.from('original');
  const saved = f.api.creations.photo('owner', room.id, 'photo-operation', image, 'image/jpeg');
  assert.throws(() => f.api.creations.photo('owner', room.id, 'photo-operation', Buffer.from('different'), 'image/jpeg'), /operation_content_conflict/);
  assert.throws(() => f.api.creations.photo('stranger', room.id, 'photo-operation', image, 'image/jpeg'), /not_found/);
  assert.throws(() => f.api.creations.photo('owner', f.roomId, 'photo-operation', image, 'image/jpeg'), /operation_content_conflict/);
  const own = f.api.creations.photo('stranger', other.id, 'photo-operation', image, 'image/jpeg');
  assert.notEqual(own.id, saved.id);
});

test('N04: disk/DB partial success preserves claim and one file; retry completes once', t => {
  const f = fixture(t), key = 'photo-operation', bytes = Buffer.from('photo');
  f.db.exec("CREATE TRIGGER fail_photo BEFORE INSERT ON room_photos BEGIN SELECT RAISE(ABORT, 'forced photo failure'); END;");
  assert.throws(() => f.api.creations.photo('owner', f.roomId, key, bytes, 'image/png'), /forced photo failure/);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_photos').get().n, 0);
  assert.throws(() => f.api.creations.photo('owner', f.roomId, key, Buffer.from('changed'), 'image/png'), /operation_content_conflict/);
  f.db.exec('DROP TRIGGER fail_photo');
  const saved = f.api.creations.photo('owner', f.roomId, key, bytes, 'image/png');
  assert.equal(f.api.creations.photo('owner', f.roomId, key, bytes, 'image/png').id, saved.id);
  assert.equal(fs.readdirSync(path.join(path.dirname(f.db.name), 'data', 'room-photos')).length, 1);
});

test('N02: late upload cannot start in a superseded scan; committed upload replay is read-only', t => {
  const f = fixture(t), a = scan(f);
  const saved = f.api.creations.photo('owner', f.roomId, 'saved-photo', Buffer.from('A'), 'image/jpeg', a.sessionKey);
  const b = scan(f, 'new-session');
  assert.throws(() => f.api.creations.photo('owner', f.roomId, 'late-photo', Buffer.from('late'), 'image/jpeg', a.sessionKey), /scan_not_active/);
  assert.equal(f.api.creations.photo('owner', f.roomId, 'saved-photo', Buffer.from('A'), 'image/jpeg', a.sessionKey).id, saved.id);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, b.analysisId);
});

test('N01: server preserves photo order and rejects foreign or duplicate photo links', t => {
  const f = fixture(t), a = scan(f);
  const one = f.api.creations.photo('owner', f.roomId, 'photo-one', Buffer.from('1'), 'image/jpeg');
  const two = f.api.creations.photo('owner', f.roomId, 'photo-two', Buffer.from('2'), 'image/jpeg');
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...a.payload, revision: a.revision, photoIds: [999] }), /invalid_photo_links/);
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...a.payload, revision: a.revision, photoIds: [one.id, one.id] }), /invalid_photo_links/);
  f.store.save(f.roomId, 'owner', { ...a.payload, revision: a.revision, photoIds: [two.id, one.id] });
  assert.equal(JSON.stringify(f.api.getRoomScan(f.roomId, 'owner').photoIds), JSON.stringify([two.id, one.id]));
});

test('N04: two workers concurrently create the same room/photo only once', async t => {
  const f = fixture(t);
  const gate = new SharedArrayBuffer(4), workers = [];
  try {
    const tasks = Array.from({ length: 2 }, () => new Promise((resolve, reject) => {
      const worker = new Worker(`
        const { workerData, parentPort } = require('node:worker_threads');
        const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
        const __dirname = workerData.testDir;
        const Database = require(workerData.databaseModule);
        const roomDecisionStore = require(workerData.storeModule);
        ${loadApi.toString()}
        const db = new Database(workerData.filename), api = loadApi(db);
        Atomics.wait(new Int32Array(workerData.gate), 0, 0);
        const room = api.creations.room('owner', 'concurrent-room', 'Concurrent');
        const photo = api.creations.photo('owner', room.id, 'concurrent-photo', Buffer.from('same bytes'), 'image/jpeg');
        db.close(); parentPort.postMessage({ room, photo });
      `, { eval: true, workerData: { gate, filename: f.db.name, testDir: __dirname,
        databaseModule: require.resolve('better-sqlite3'), storeModule: require.resolve('../lib/roomDecisionStore.cjs') } });
      workers.push(worker); let result;
      worker.on('message', value => { result = value; }); worker.on('error', reject);
      worker.on('exit', code => code ? reject(new Error('worker failed ' + code)) : resolve(result));
    }));
    Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0);
    const [one, two] = await Promise.all(tasks);
    assert.equal(one.room.id, two.room.id); assert.equal(one.photo.id, two.photo.id);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM rooms').get().n, 2); // fixture room + created room
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_photos').get().n, 1);
    assert.equal(fs.readdirSync(path.join(path.dirname(f.db.name), 'data', 'room-photos')).length, 1);
  } finally { await Promise.all(workers.map(worker => worker.terminate())); }
});

test('N04: actual creation routes replay requests and enforce required operation keys', async t => {
  const f = fixture(t);
  function route(file) {
    const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
    const ctx = { creations: f.api.creations, getIdentity: async () => ({ id: 'owner' }), Buffer, console,
      NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
    vm.createContext(ctx); vm.runInContext(code + ';globalThis.post=POST;', ctx); return ctx.post;
  }
  const postRoom = route('app/api/rooms/route.js');
  const req = { json: async () => ({ operationKey: 'route-room', name: 'Route Room' }) };
  const room = await postRoom(req); assert.equal(room.status, 200);
  assert.equal((await postRoom(req)).body.id, room.body.id);
  assert.equal((await postRoom({ json: async () => ({ name: 'Old client' }) })).status, 400);
  const postPhoto = route('app/api/rooms/[id]/photos/route.js');
  const fd = new FormData(); fd.append('photo', new Blob(['image'], { type: 'image/jpeg' }), 'test.jpg'); fd.append('operationKey', 'route-photo');
  const request = { formData: async () => fd }, params = { params: Promise.resolve({ id: String(room.body.id) }) };
  const photo = await postPhoto(request, params);
  assert.equal(photo.status, 200); assert.equal((await postPhoto(request, params)).body.id, photo.body.id);
});

// Evaluate the real DB functions/schema, replacing ONLY the connection bootstrap.
// No import of lib/db.js (which would open the user's database) is permitted.
function fixture(t, beforeInit) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-decisions-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  if (beforeInit) beforeInit(db);
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-decisions-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const room = api.createRoom('owner', 'Ev Ofisi');
  return { db, api, store: api.roomDecisions, roomId: room.id };
}
const item = { id: 'item-1', label: 'Koltuk', category: 'Mobilya', recommendation: 'sat', reasoning: 'Model gerekçesi', excluded: false, manual: false };
const freshItems = () => sources.reconcileRoomItems([item]).map(i => ({ ...i }));
function scan(f, key = 'test-session-one') {
  const payload = { sessionKey: key, revision: 0, items: freshItems(), messages: [], photoIds: [] };
  const current = f.store.status(f.roomId, 'owner');
  f.store.begin(f.roomId, 'owner', { sessionKey: key, expectedGeneration: current.generation, replace: true });
  return { ...f.store.save(f.roomId, 'owner', payload), payload };
}
function counts(f) {
  return { rows: f.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,
    points: f.api.getState('owner').points, total: f.api.getState('owner').totalDecisions };
}

for (const value of ['tut', 'sat', 'bagisla', 'geri_donustur', 'at']) {
  test(`AUDIT-02: explicit same-value ${value} survives route, DB, resume and AI`, async t => {
    const f = fixture(t), s = scan(f);
    const original = freshItems().map(i => ({ ...i, recommendation: value, modelSuggestion: { recommendation: value, reasoning: 'fixture' } }));
    const saved = f.store.save(f.roomId, 'owner', { ...s.payload, revision: s.revision, items: original });
    const choices = [{ id: item.id, recommendation: value, excluded: false, manual: true }];
    const result = await routeFor(f)('PATCH', { ...saved, choices });
    assert.equal(result.status, 200);
    assert.equal(result.body.items[0].manual, true);
    const row = f.db.prepare('SELECT draft_items_json FROM room_analyses WHERE id=?').get(s.analysisId);
    assert.equal(JSON.parse(row.draft_items_json)[0].manual, true);
    const resumed = f.api.getRoomScan(f.roomId, 'owner');
    assert.equal(resumed.items[0].manual, true);
    const next = sources.reconcileRoomItems([{ ...item, recommendation: value === 'tut' ? 'at' : 'tut' }], resumed.items, true);
    assert.equal(next[0].recommendation, value);
    const replay = await routeFor(f)('PATCH', { ...saved, choices });
    assert.equal(replay.body.revision, result.body.revision);
  });
}

test('AUDIT-02: explicit A-B-A, different choice and exclusion retain intent; invalid manual is rejected', async t => {
  const f = fixture(t), s = scan(f), request = routeFor(f);
  for (const manual of ['true', 1, null]) {
    assert.equal((await request('PATCH', { ...s, choices: [{ id: item.id, recommendation: 'sat', excluded: false, manual }] })).status, 400);
  }
  let receipt = s;
  for (const [recommendation, excluded] of [['tut', false], ['sat', true], ['sat', false]]) {
    const r = await request('PATCH', { ...receipt, choices: [{ id: item.id, recommendation, excluded, manual: true }] });
    assert.equal(r.status, 200); receipt = r.body;
    assert.equal(r.body.items[0].manual, true);
    assert.equal(r.body.items[0].recommendation, recommendation);
    assert.equal(r.body.items[0].excluded, excluded);
  }
});

test('AUDIT-02: stale manual-only update is not mistaken for an exact replay', t => {
  const f = fixture(t), s = scan(f);
  f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'sat', excluded: false, manual: false }] });
  assert.throws(() => f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'sat', excluded: false, manual: true }] }), /revision_conflict/);
});

test('AUDIT-02: old payload compatibility preserves known intent without making every item manual', t => {
  const f = fixture(t), s = scan(f);
  const untouched = f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'sat', excluded: true }] });
  assert.equal(untouched.items[0].manual, false);
  const changed = f.store.draft(f.roomId, 'owner', { ...untouched, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] });
  assert.equal(changed.items[0].manual, true);
  const retained = f.store.draft(f.roomId, 'owner', { ...changed, choices: [{ id: item.id, recommendation: 'tut', excluded: false, manual: false }] });
  assert.equal(retained.items[0].manual, true);
});

test('AUDIT-02: shuffled five-item payload preserves identity, explicit intent and excluded final decisions', async t => {
  const f = fixture(t), s = scan(f), request = routeFor(f);
  const values = ['tut', 'sat', 'bagisla', 'geri_donustur', 'at'];
  const items = values.map((value, index) => ({ ...freshItems()[0], id: `item-${index + 1}`, recommendation: value }));
  const saved = f.store.save(f.roomId, 'owner', { ...s.payload, revision: s.revision, items });
  const choices = items.map((i, index) => ({ id: i.id, recommendation: i.recommendation, manual: index !== 4, excluded: index === 4 })).reverse();
  const patched = await request('PATCH', { ...saved, choices });
  assert.equal(patched.status, 200);
  for (const i of f.api.getRoomScan(f.roomId, 'owner').items) {
    const expected = choices.find(c => c.id === i.id);
    assert.equal(i.recommendation, expected.recommendation);
    assert.equal(i.manual, expected.manual);
    assert.equal(i.excluded, expected.excluded);
  }
  const confirmed = await request('PUT', patched.body);
  assert.equal(confirmed.body.count, 4);
  assert.deepEqual(f.db.prepare('SELECT recommendation FROM decisions ORDER BY id').all().map(i => i.recommendation), values.slice(0, 4));
  const final = f.api.getRoomAnalyses(f.roomId, 'owner')[0].finalItems;
  assert.equal(final[4].id, 'item-5'); assert.equal(final[4].excluded, true); assert.equal(final[4].manual, false);
});

test('late FIRST POST of reserved A cannot replace newer B', t => {
  const f = fixture(t);
  f.store.begin(f.roomId, 'owner', { sessionKey: 'old-session-A', expectedGeneration: 0 });
  const b = scan(f, 'new-session-B');
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...b.payload, sessionKey: 'old-session-A' }), /scan_not_active/);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, b.analysisId);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM room_analyses').get().n, 1);
});

test('missing active row never permits an existing analysis to reactivate', t => {
  const f = fixture(t), a = scan(f);
  f.db.prepare('DELETE FROM room_scans WHERE room_id=?').run(f.roomId);
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...a.payload, revision: a.revision }), /scan_not_active/);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner'), null);
});

test('new scan requires explicit replacement and current generation; stale begin cannot win', t => {
  const f = fixture(t), a = scan(f);
  const current = f.store.status(f.roomId, 'owner');
  const input = { sessionKey: 'replacement-B', expectedGeneration: current.generation };
  assert.throws(() => f.store.begin(f.roomId, 'owner', input), /active_scan_exists/);
  f.store.begin(f.roomId, 'owner', { ...input, replace: true });
  assert.throws(() => f.store.begin(f.roomId, 'owner', { ...input, sessionKey: 'delayed-C', replace: true }), /session_conflict/);
  assert.equal(f.store.read(f.roomId, 'owner', a.analysisId).closed, true);
  assert.deepEqual(counts(f), { rows: 0, points: 0, total: 0 });
});

test('close keeps analysis and chat, adds no decision, and blocks later writes', t => {
  const f = fixture(t), a = scan(f);
  const before = f.db.prepare('SELECT items_json,messages_json,photo_ids_json FROM room_analyses WHERE id=?').get(a.analysisId);
  f.store.close(f.roomId, 'owner', a);
  assert.deepEqual(f.db.prepare('SELECT items_json,messages_json,photo_ids_json FROM room_analyses WHERE id=?').get(a.analysisId), before);
  assert.equal(f.api.getRoomAnalyses(f.roomId, 'owner')[0].closeReason, 'unconfirmed');
  assert.equal(f.api.getRoomScan(f.roomId, 'owner'), null);
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...a.payload, revision: a.revision }), /analysis_closed/);
  assert.throws(() => f.store.confirm(f.roomId, 'owner', a), /analysis_closed/);
  assert.deepEqual(counts(f), { rows: 0, points: 0, total: 0 });
});

test('orphan closes into unknown-status archive; stale orphan close cannot touch B', async t => {
  const f = fixture(t);
  const chat = [{ role: 'user', content: 'Eski sohbet' }];
  f.api.saveRoomScan(f.roomId, 'owner', [item], chat, null);
  const status = f.store.status(f.roomId, 'owner');
  const target = { orphanToken: status.orphanToken, expectedGeneration: status.generation };
  assert.equal((await routeFor(f)('DELETE', target)).status, 200);
  const history = f.api.getRoomAnalyses(f.roomId, 'owner')[0];
  assert.equal(history.closeReason, 'legacy_unknown');
  assert.equal(history.closed, true); assert.equal(history.items[0].modelSuggestion, null);
  assert.equal(history.messages[0].content, chat[0].content);
  assert.equal(history.finalItems, null);
  const b = scan(f, 'new-session-B');
  assert.equal((await routeFor(f)('DELETE', target)).status, 409);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, b.analysisId);
  assert.equal(counts(f).rows, 0);
});

test('POST/PATCH run real validators, reject invalid source and malformed choices', async t => {
  const f = fixture(t), request = routeFor(f);
  const payload = { sessionKey: 'route-session', revision: 0, items: freshItems(), messages: [], photoIds: [] };
  assert.equal((await request('POST', { action: 'begin', sessionKey: payload.sessionKey, expectedGeneration: 0 })).status, 200);
  for (const bad of [{ recommendation: 'unknown', reasoning: '' }, { recommendation: 'sat', reasoning: 'x'.repeat(301) }, []]) {
    assert.equal((await request('POST', { ...payload, items: [{ ...payload.items[0], modelSuggestion: bad }] })).status, 400);
  }
  assert.equal((await request('POST', { ...payload, messages: [{ role: 'bad', content: 'x' }] })).status, 400);
  const response = await request('POST', payload);
  assert.equal(response.status, 200);
  assert.equal((await request('PATCH', { ...response.body, choices: [null] })).status, 400);
  assert.equal((await request('PATCH', { ...response.body, choices: [{ id: item.id, recommendation: 'bad', excluded: false }] })).status, 400);
  const draft = await request('PATCH', { ...response.body, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] });
  assert.equal(draft.status, 200); assert.equal(draft.body.items[0].modelSuggestion.recommendation, 'sat');
  assert.equal((await request('POST', { ...payload, protocol: undefined })).body.error, 'client_upgrade_required');
});

test('two SQLite connections overlap confirmations: loser rolls back, retry replays', t => {
  const f = fixture(t), a = scan(f);
  const secondDb = new Database(f.db.name);
  const second = loadApi(secondDb);
  let overlap = true;
  const firstStore = roomDecisionStore.createRoomDecisionStore(f.db, {
    saveAnalysis: f.api.saveRoomAnalysis, saveScan: f.api.saveRoomScan, getState: f.api.getState,
    recordDecisions(...args) {
      if (overlap) { overlap = false; second.roomDecisions.confirm(f.roomId, 'owner', a); }
      return f.api.recordDecisions(...args);
    },
  });
  try {
    assert.throws(() => firstStore.confirm(f.roomId, 'owner', a), e => e.code === 'SQLITE_BUSY_SNAPSHOT');
    assert.equal(firstStore.confirm(f.roomId, 'owner', a).replayed, true);
    assert.deepEqual(counts(f), { rows: 1, points: 5, total: 1 });
  } finally { secondDb.close(); }
});

test('parallel fresh-schema initialization serializes additive migrations', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-migration-'));
  const filename = path.join(directory, 'isolated.db');
  const seed = new Database(filename); seed.pragma('journal_mode = WAL'); seed.close();
  const gate = new SharedArrayBuffer(4);
  const workers = [];
  try {
    const jobs = Array.from({ length: 4 }, () => new Promise((resolve, reject) => {
      const worker = new Worker(`
        const { workerData, parentPort } = require('node:worker_threads');
        const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
        const __dirname = workerData.testDir;
        const Database = require(workerData.databaseModule);
        const roomDecisionStore = require(workerData.storeModule);
        ${loadApi.toString()}
        Atomics.wait(new Int32Array(workerData.gate), 0, 0);
        const db = new Database(workerData.filename);
        loadApi(db);
        db.close(); parentPort.postMessage('done');
      `, { eval: true, workerData: { gate, filename, testDir: __dirname,
        databaseModule: require.resolve('better-sqlite3'), storeModule: require.resolve('../lib/roomDecisionStore.cjs') } });
      workers.push(worker);
      worker.once('error', reject); worker.once('exit', code => code ? reject(new Error(`worker exit ${code}`)) : resolve());
    }));
    Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0);
    await Promise.all(jobs);
    const db = new Database(filename);
    try {
      assert.ok(db.prepare('PRAGMA table_info(room_analyses)').all().some(c => c.name === 'close_reason'));
      assert.ok(db.prepare('PRAGMA table_info(decisions)').all().some(c => c.name === 'room'));
      assert.equal(db.prepare('SELECT COUNT(*) n FROM decisions').get().n, 0);
    } finally { db.close(); }
  } finally {
    await Promise.all(workers.map(w => w.terminate()));
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('sestia-migration-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('same confirmation twice adds decisions, points and counters once', t => {
  const f = fixture(t), s = scan(f);
  const first = f.store.confirm(f.roomId, 'owner', s);
  const again = f.store.confirm(f.roomId, 'owner', s);
  assert.equal(first.replayed, false); assert.equal(again.replayed, true);
  assert.deepEqual(counts(f), { rows: 1, points: 5, total: 1 });
});

test('new endpoints retain ownership, no-items validation and category length normalization', async t => {
  const f = fixture(t), a = scan(f);
  assert.throws(() => f.store.status(f.roomId, 'stranger'), /not_found/);
  assert.throws(() => f.store.begin(f.roomId, 'stranger', { sessionKey: 'wrong-owner', expectedGeneration: 1 }), /not_found/);
  const d = f.store.draft(f.roomId, 'owner', { ...a, choices: [{ id: item.id, recommendation: 'sat', excluded: true }] });
  assert.equal((await routeFor(f)('PUT', d)).body.error, 'no_items');
  f.store.close(f.roomId, 'owner', d);
  const b = scan(f, 'category-session');
  const saved = f.store.save(f.roomId, 'owner', { ...b.payload, revision: b.revision, items: [{ ...freshItems()[0], category: 'x'.repeat(300) }] });
  f.store.confirm(f.roomId, 'owner', saved);
  const decision = f.db.prepare('SELECT category,room FROM decisions').get();
  assert.equal(decision.category.length, 60); assert.equal(decision.room, 'Ev Ofisi');
});

test('unexpected errors are logged; SQLite contention has recoverable 409 code', async t => {
  const f = fixture(t), a = scan(f), logs = [];
  for (const code of ['SQLITE_BUSY_SNAPSHOT', 'SQLITE_IOERR']) {
    const failing = { ...f, store: { ...f.store, confirm() { throw Object.assign(new Error('test failure'), { code }); } } };
    const result = await routeFor(failing, 'owner', { error: (...args) => logs.push(args) })('PUT', a);
    assert.equal(result.status, code === 'SQLITE_BUSY_SNAPSHOT' ? 409 : 500);
  }
  assert.equal(logs.length, 2); assert.equal(logs[0][1].code, 'SQLITE_BUSY_SNAPSHOT');
  assert.equal(counts(f).rows, 0);
});
test('lost HTTP response: server receipt survives retry and no duplicate is inserted', t => {
  const f = fixture(t), s = scan(f);
  f.store.confirm(f.roomId, 'owner', s); // discard the committed response
  const result = f.store.confirm(f.roomId, 'owner', s);
  assert.equal(result.count, 1); assert.equal(result.replayed, true);
  assert.deepEqual(counts(f), { rows: 1, points: 5, total: 1 });
});
test('late close of A neither deletes active B nor finalizes B', t => {
  const f = fixture(t), a = scan(f), b = scan(f, 'test-session-two');
  f.store.close(f.roomId, 'owner', a);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, b.analysisId);
  assert.equal(f.db.prepare('SELECT final_items_json FROM room_analyses WHERE id=?').get(b.analysisId).final_items_json, null);
});
test('replacement closes A; late confirmation and POST cannot reopen it', t => {
  const f = fixture(t), a = scan(f), b = scan(f, 'test-session-two');
  assert.throws(() => f.store.confirm(f.roomId, 'owner', a), /analysis_closed/);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, b.analysisId);
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...a.payload, revision: a.revision }), /analysis_closed/);
});
test('manual selection and later chat preserve real initial model source', t => {
  const f = fixture(t), s = scan(f);
  const draft = f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] });
  const chat = sources.reconcileRoomItems([{ ...item, recommendation: 'tut' }], draft.items, true);
  assert.equal(chat[0].recommendation, 'tut');
  assert.equal(chat[0].modelSuggestion.recommendation, 'sat');
  f.store.save(f.roomId, 'owner', { ...s.payload, revision: draft.revision, items: chat });
  const history = f.api.getRoomAnalyses(f.roomId, 'owner')[0];
  assert.equal(history.items[0].modelSuggestion.recommendation, 'sat');
  assert.match(sources.suggestionLabel(history.items[0], { sat: { label: 'Sat' }, tut: { label: 'Tut' } }), /Sat$/);
});
test('saved draft is restored when resuming the room; it is not a final decision', t => {
  const f = fixture(t), s = scan(f);
  f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'tut', excluded: true }] });
  const resumed = f.api.getRoomScan(f.roomId, 'owner');
  assert.equal(resumed.items[0].recommendation, 'tut'); assert.equal(resumed.items[0].excluded, true);
  assert.equal(f.api.getRoomAnalyses(f.roomId, 'owner')[0].finalItems, null);
  assert.equal(counts(f).rows, 0);
});
test('final history exposes model suggestion and final user decision separately', t => {
  const f = fixture(t), s = scan(f);
  const d = f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] });
  f.store.confirm(f.roomId, 'owner', d);
  const h = f.api.getRoomAnalyses(f.roomId, 'owner')[0];
  assert.equal(h.items[0].modelSuggestion.recommendation, 'sat');
  assert.equal(h.finalItems[0].recommendation, 'tut');
  assert.equal(f.db.prepare('SELECT recommendation FROM decisions').get().recommendation, 'tut');
});
test('legacy rows and legacy decisions remain readable, original suggestion is never guessed', t => {
  const f = fixture(t);
  const id = f.api.saveRoomAnalysis(f.roomId, 'owner', 'legacy-session', [{ ...item, manual: true, recommendation: 'tut' }], [], []);
  f.api.saveRoomScan(f.roomId, 'owner', [item], [], id);
  const h = f.api.getRoomAnalyses(f.roomId, 'owner')[0];
  assert.equal(h.items[0].modelSuggestion, null);
  assert.match(sources.suggestionLabel(h.items[0], {}), /özgün kaynağı doğrulanamıyor/);
  const legacy = f.store.read(f.roomId, 'owner', id);
  assert.throws(() => f.store.confirm(f.roomId, 'owner', legacy), /legacy_confirmation_unknown/);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, id);
  assert.equal(counts(f).rows, 0);
});
test('old finalized analysis cannot create decisions again', t => {
  const f = fixture(t), s = scan(f);
  f.db.prepare('UPDATE room_analyses SET final_items_json=?, suggestions_json=NULL WHERE id=?').run(JSON.stringify([item]), s.analysisId);
  assert.throws(() => f.store.confirm(f.roomId, 'owner', s), /analysis_closed/);
  assert.equal(counts(f).rows, 0);
});
test('legacy active scan without analysis linkage can still be read', t => {
  const f = fixture(t);
  f.api.saveRoomScan(f.roomId, 'owner', [item], [], null);
  const s = f.api.getRoomScan(f.roomId, 'owner');
  assert.equal(s.analysisId, null); assert.equal(s.items[0].modelSuggestion, null);
});
test('ownership is enforced for draft, confirmation, close and snapshot updates', t => {
  const f = fixture(t), s = scan(f);
  for (const op of ['draft','confirm','close']) assert.throws(() => f.store[op](f.roomId, 'stranger', s), /not_found/);
  assert.throws(() => f.store.save(f.roomId, 'stranger', { ...s.payload, revision: s.revision }), /not_found/);
  assert.equal(counts(f).rows, 0);
});
test('stale revision cannot confirm a more recent draft', t => {
  const f = fixture(t), s = scan(f);
  f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] });
  assert.throws(() => f.store.confirm(f.roomId, 'owner', s), /revision_conflict/);
  assert.equal(counts(f).rows, 0);
});
test('transaction rolls back decisions and counters if recording receipt fails', t => {
  const f = fixture(t), s = scan(f);
  f.db.exec("CREATE TRIGGER fail_receipt BEFORE UPDATE OF confirmation_json ON room_analyses BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
  assert.throws(() => f.store.confirm(f.roomId, 'owner', s), /test failure/);
  assert.deepEqual(counts(f), { rows: 0, points: 0, total: 0 });
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, s.analysisId);
});
test('lost snapshot/draft responses can be retried exactly without extra revisions', t => {
  const f = fixture(t), s = scan(f);
  assert.equal(f.store.save(f.roomId, 'owner', s.payload).revision, s.revision);
  const input = { ...s, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] };
  const d = f.store.draft(f.roomId, 'owner', input);
  assert.equal(f.store.draft(f.roomId, 'owner', input).revision, d.revision);
});
test('migrations are additive and repeatable', t => {
  const f = fixture(t), s = scan(f);
  const before = f.db.prepare('SELECT * FROM room_analyses').all();
  roomDecisionStore.createRoomDecisionStore(f.db, {});
  assert.deepEqual(f.db.prepare('SELECT * FROM room_analyses').all(), before);
  assert.equal(f.store.read(f.roomId, 'owner', s.analysisId).analysisId, s.analysisId);
});

function routeFor(f, owner = 'owner', logger = console) {
  let code = fs.readFileSync(path.join(__dirname, '../app/api/rooms/[id]/scan/route.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = { roomDecisions: f.store, getIdentity: async () => owner ? { id: owner } : null,
    ...validators(), console: logger, URL,
    NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.routes={POST,PUT,PATCH,DELETE,GET};', ctx);
  return (method, body) => ctx.routes[method]({ url: 'http://test/scan', json: async () => ({protocol: 2, ...body}) }, { params: Promise.resolve({ id: String(f.roomId) }) });
}
test('real HTTP handler: lost PUT result then retry succeeds exactly once', async t => {
  const f = fixture(t), s = scan(f), request = routeFor(f);
  assert.equal((await request('PUT', s)).status, 200); // transport drops response
  const retried = await request('PUT', s);
  assert.equal(retried.status, 200); assert.equal(retried.body.replayed, true);
  assert.deepEqual(counts(f), { rows: 1, points: 5, total: 1 });
});
test('HTTP handler rejects untargeted old DELETE and unauthorized requests', async t => {
  const f = fixture(t), s = scan(f);
  assert.equal((await routeFor(f)('DELETE', { finalItems: [item] })).status, 400);
  assert.equal((await routeFor(f, null)('PUT', s)).status, 401);
  assert.equal((await routeFor(f, 'stranger')('PUT', s)).status, 404);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').analysisId, s.analysisId);
});
test('confirmation uses saved draft, never unsolicited finalItems in request', t => {
  const f = fixture(t), s = scan(f);
  f.store.confirm(f.roomId, 'owner', { ...s, finalItems: [{ ...item, recommendation: 'at' }] });
  assert.equal(f.db.prepare('SELECT recommendation FROM decisions').get().recommendation, 'sat');
});
test('old snapshot cannot overwrite a saved user draft', t => {
  const f = fixture(t), s = scan(f);
  f.store.draft(f.roomId, 'owner', { ...s, choices: [{ id: item.id, recommendation: 'tut', excluded: false }] });
  assert.throws(() => f.store.save(f.roomId, 'owner', { ...s.payload, revision: s.revision }), /revision_conflict/);
  assert.equal(f.api.getRoomScan(f.roomId, 'owner').items[0].recommendation, 'tut');
});
test('a retried old confirmation returns current totals after another analysis was confirmed', t => {
  const f = fixture(t), a = scan(f);
  f.store.confirm(f.roomId, 'owner', a);
  const b = scan(f, 'test-session-two'); f.store.confirm(f.roomId, 'owner', b);
  assert.equal(f.store.confirm(f.roomId, 'owner', a).state.totalDecisions, 2);
  assert.deepEqual(counts(f), { rows: 2, points: 10, total: 2 });
});
test('populated pre-phase schema migrates without changing legacy payloads', t => {
  const legacyItems = JSON.stringify([item]);
  const f = fixture(t, db => {
    db.exec(`CREATE TABLE room_analyses (
      id INTEGER PRIMARY KEY, room_id INTEGER NOT NULL, device_id TEXT NOT NULL,
      session_key TEXT UNIQUE NOT NULL, items_json TEXT NOT NULL, messages_json TEXT NOT NULL DEFAULT '[]',
      photo_ids_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')));`);
    db.prepare('INSERT INTO room_analyses (id,room_id,device_id,session_key,items_json) VALUES (77,1,?,?,?)')
      .run('owner', 'old-schema-session', legacyItems);
  });
  const row = f.db.prepare('SELECT * FROM room_analyses WHERE id=77').get();
  assert.equal(row.items_json, legacyItems); assert.equal(row.suggestions_json, null);
  assert.equal(row.confirmation_json, null); assert.equal(row.revision, 0);
  assert.equal(f.api.getRoomAnalyses(f.roomId, 'owner')[0].items[0].modelSuggestion, null);
});

function validators() {
  const source = fs.readFileSync(path.join(__dirname, '../lib/anthropic.js'), 'utf8');
  const names = ['validRoomItems','validRoomScanMessages'];
  const ctx = {};
  vm.createContext(ctx);
  let code = source.match(/export const RECOMMENDATIONS = .*;/)[0].replace('export ', '');
  for (const name of names) {
    const start = source.indexOf('export function ' + name + '(');
    const end = source.indexOf('\n}', start) + 2;
    code += '\n' + source.slice(start, end).replace('export ', '');
  }
  vm.runInContext(code + ';globalThis.validators={validRoomItems,validRoomScanMessages};', ctx);
  return ctx.validators;
}

function loadApi(db) {
  let code = fs.readFileSync(path.join(__dirname, '../lib/db.js'), 'utf8');
  const start = code.indexOf('const dataDir =');
  const end = code.indexOf("withBusyRetry(() => db.pragma('journal_mode = WAL'));");
  assert.ok(start > 0 && end > start, 'connection bootstrap must be explicitly replaced');
  code = code.slice(0, start) + 'const db = __testDb;\n' + code.slice(end);
  code = code.replace(/^import .*;\r?\n/gm, '').replace(/^export default db;?/gm, '').replace(/^export /gm, '');
  const ctx = { __testDb: db, roomDecisionStore, path, process: { cwd: () => path.dirname(db.name) },
    creationStore: require(path.join(__dirname, '../lib/creationStore.cjs')),
    toparlaStore: require(path.join(__dirname, '../lib/toparlaStore.cjs')),
    chatAttachmentStore: require(path.join(__dirname, '../lib/chatAttachmentStore.cjs')) };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.api={roomDecisions,createRoom,getState,getRoomScan,getRoomAnalyses,saveRoomAnalysis,saveRoomScan,recordDecisions,creations,addRoomPhoto};', ctx);
  return ctx.api;
}

test('E2E §4.2: empty reservation is released via DELETE; next scan needs no replacement', async t => {
  const f = fixture(t), request = routeFor(f);
  const begun = f.store.begin(f.roomId, 'owner', { sessionKey: 'empty-session', expectedGeneration: 0 });
  assert.equal(begun.active, true);
  const res = await request('DELETE', { action: 'release', sessionKey: 'empty-session' });
  assert.equal(res.status, 200); assert.equal(res.body.released, true);
  const after = f.store.status(f.roomId, 'owner');
  assert.equal(after.active, false); assert.equal(after.generation, begun.generation + 1);
  // No replace flag needed: nothing is open any more.
  f.store.begin(f.roomId, 'owner', { sessionKey: 'next-session', expectedGeneration: after.generation });
  assert.equal((await request('DELETE', { action: 'release', sessionKey: 'bad' })).status, 400);
});

test('E2E §4.2: release never ends a newer scan or one with a saved analysis', t => {
  const f = fixture(t);
  f.store.begin(f.roomId, 'owner', { sessionKey: 'old-empty-session', expectedGeneration: 0 });
  const b = scan(f, 'newer-session-b'); // Replaces A; B has a saved analysis.
  const before = f.store.status(f.roomId, 'owner');
  assert.deepEqual(f.store.releaseEmpty(f.roomId, 'owner', { sessionKey: 'old-empty-session' }), { released: false });
  assert.deepEqual(f.store.releaseEmpty(f.roomId, 'owner', { sessionKey: 'newer-session-b' }), { released: false });
  assert.deepEqual(f.store.status(f.roomId, 'owner'), before);
  assert.equal(f.store.read(f.roomId, 'owner', b.analysisId).closed, false);
  assert.throws(() => f.store.releaseEmpty(f.roomId, 'stranger', { sessionKey: 'newer-session-b' }), /not_found/);
});
