// "Odayı yeniden yap" (P5 v1): the geometry checks and AI-answer reader in
// lib/roomRedesign.cjs, the redesign store in lib/db.js (isolated database),
// and the API route with the AI call stubbed — no network, no real photos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const redesign = require('../lib/roomRedesign.cjs');

// A 400 × 300 cm room (wall centre lines), 10 cm walls, a 90 cm door in the
// bottom wall and a window in the top one.
const ROOM = () => ({
  walls: [
    { id: 1, a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10 },
    { id: 2, a: { x: 400, y: 0 }, b: { x: 400, y: 300 }, thickness: 10 },
    { id: 3, a: { x: 400, y: 300 }, b: { x: 0, y: 300 }, thickness: 10 },
    { id: 4, a: { x: 0, y: 300 }, b: { x: 0, y: 0 }, thickness: 10 },
  ],
  openings: [
    { id: 5, wall: 3, t: 0.5, type: 'door', width: 90 },
    { id: 6, wall: 1, t: 0.5, type: 'window', width: 120 },
  ],
  photos: [{ id: 7, photoId: 41, x: 50, y: 250, angle: 315 }],
  next: 8,
});

// An L-shaped room: the top-right 200 × 150 corner is not part of it.
const L_ROOM = () => ({
  walls: [
    { id: 1, a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, thickness: 10 },
    { id: 2, a: { x: 200, y: 0 }, b: { x: 200, y: 150 }, thickness: 10 },
    { id: 3, a: { x: 200, y: 150 }, b: { x: 400, y: 150 }, thickness: 10 },
    { id: 4, a: { x: 400, y: 150 }, b: { x: 400, y: 300 }, thickness: 10 },
    { id: 5, a: { x: 400, y: 300 }, b: { x: 0, y: 300 }, thickness: 10 },
    { id: 6, a: { x: 0, y: 300 }, b: { x: 0, y: 0 }, thickness: 10 },
  ],
  openings: [],
  photos: [],
  next: 7,
});

const FURNITURE = [
  { key: 'k1', name: 'kanepe', w: 200, d: 90 },
  { key: 'k2', name: 'masa', w: 120, d: 60 },
  { key: 'k3', name: 'kutu yığını', w: 60, d: 40 },
];
// Sofa against the left wall facing right, desk under the window, boxes out.
const GOOD_LAYOUT = () => ({
  title: 'Pencere önü çalışma',
  idea: 'Masa pencereye, kanepe sol duvara.',
  why: 'Gün ışığı masaya düşer.',
  items: [
    { key: 'k1', x: 50, y: 150, rotation: 270 },
    { key: 'k2', x: 200, y: 35, rotation: 0 },
  ],
  removed: [{ key: 'k3', reason: 'hedefe hizmet etmiyor' }],
  steps: ['Kutuları çıkar', 'Kanepeyi sol duvara it', 'Masayı pencereye al'],
});
const answer = (layouts = [GOOD_LAYOUT(), GOOD_LAYOUT(), GOOD_LAYOUT()]) => ({ furniture: FURNITURE, layouts, unseen: '' });
const kinds = (issues) => issues.map((issue) => issue.kind).sort();

test('a layout that fits passes every check', () => {
  const result = redesign.normalizeRedesign(answer());
  assert.ok(result);
  assert.deepEqual(redesign.checkRedesign(result, ROOM()), [[], [], []]);
});

test('furniture crossing a wall, overlapping, in a door’s way or left out is reported', () => {
  const layout = GOOD_LAYOUT();
  layout.items = [
    { key: 'k1', x: 20, y: 150, rotation: 270 }, // 90 deep, centre 20 cm from the wall line: into the wall
    { key: 'k2', x: 200, y: 265, rotation: 0 }, // right in front of the door
  ];
  layout.removed = [];
  const issues = redesign.checkLayout(redesign.normalizeRedesign(answer([layout, GOOD_LAYOUT(), GOOD_LAYOUT()])).layouts[0], FURNITURE, ROOM());
  assert.deepEqual(kinds(issues), ['door', 'missing', 'wall']);
  assert.match(issues.find((i) => i.kind === 'door').text, /masa kapının açılacağı yeri kapatıyor/);

  layout.items = [{ key: 'k1', x: 150, y: 150, rotation: 0 }, { key: 'k2', x: 200, y: 160, rotation: 0 }, { key: 'k3', x: 330, y: 60, rotation: 0 }];
  assert.deepEqual(kinds(redesign.checkLayout(layout, FURNITURE, ROOM())), ['overlap']);
});

test('a piece in the notch of an L-shaped room is outside it', () => {
  const layout = { ...GOOD_LAYOUT(), items: [{ key: 'k2', x: 300, y: 75, rotation: 0 }, { key: 'k1', x: 120, y: 230, rotation: 0 }], removed: [{ key: 'k3' }] };
  const issues = redesign.checkLayout(layout, FURNITURE, L_ROOM());
  assert.deepEqual(issues.map((i) => [i.kind, i.keys[0]]), [['outside', 'k2']]);
  assert.equal(redesign.enclosed({ x: 300, y: 225 }, L_ROOM().walls), true);
});

test('rotation turns the footprint, and only 90° steps are accepted', () => {
  assert.deepEqual(redesign.footprint({ x: 100, y: 100, rotation: 90 }, { w: 200, d: 80 }), { x1: 60, y1: 0, x2: 140, y2: 200 });
  const bad = GOOD_LAYOUT();
  bad.items[0].rotation = 45;
  assert.equal(redesign.normalizeRedesign(answer([bad, GOOD_LAYOUT(), GOOD_LAYOUT()])), null);
});

test('the AI answer is read strictly: wrong shapes are rejected, not repaired', () => {
  const twice = GOOD_LAYOUT();
  twice.removed = [{ key: 'k1' }]; // placed and removed
  const unknown = GOOD_LAYOUT();
  unknown.items.push({ key: 'k9', x: 1, y: 1, rotation: 0 });
  for (const raw of [
    null, {}, answer([GOOD_LAYOUT(), GOOD_LAYOUT()]), answer([twice, GOOD_LAYOUT(), GOOD_LAYOUT()]),
    answer([unknown, GOOD_LAYOUT(), GOOD_LAYOUT()]), { ...answer(), furniture: [] },
    { ...answer(), furniture: [...FURNITURE, { key: 'k1', name: 'aynı anahtar', w: 50, d: 50 }] },
    { ...answer(), furniture: [{ key: 'k1', name: 'dev', w: 5000, d: 50 }] },
    answer([{ ...GOOD_LAYOUT(), steps: [] }, GOOD_LAYOUT(), GOOD_LAYOUT()]),
  ]) assert.equal(redesign.normalizeRedesign(raw), null);
  const extra = { ...answer(), secret: 'x' };
  extra.layouts[0].secret = 'y';
  const result = redesign.normalizeRedesign(extra);
  assert.equal('secret' in result, false);
  assert.equal('secret' in result.layouts[0], false);
});

test('the plan description gives walls, openings and placed photos in centimetres', () => {
  const text = redesign.describePlan(ROOM(), new Map([[41, 2]]));
  assert.match(text, /genişlik 400 cm, derinlik 300 cm/);
  assert.match(text, /D1: \(0, 0\) → \(400, 0\), 400 cm, kalınlık 10 cm/);
  assert.match(text, /Kapı: D3 üzerinde, merkez \(200, 300\), genişlik 90 cm/);
  assert.match(text, /Fotoğraf 2: \(50, 250\) noktasından 315° yönüne/);
  assert.doesNotMatch(redesign.describePlan(ROOM()), /Fotoğraf/, 'a photo not sent to the AI is not described');
});

// ---------------------------------------------------------------------------
// Store and route on an isolated database

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
  vm.runInContext(code + ';globalThis.api={createRoom,putRoomBlueprint,getRoomDetail,getRedesignInput,saveRoomRedesign,deleteRoomPhoto};', ctx);
  return ctx.api;
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-redesign-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-redesign-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const room = api.createRoom('owner', 'Salon');
  const addPhoto = (roomId = room.id, owner = 'owner') =>
    Number(db.prepare('INSERT INTO room_photos (room_id, device_id, filename, mime_type) VALUES (?, ?, ?, ?)').run(roomId, owner, `p-${Math.random()}.jpg`, 'image/jpeg').lastInsertRowid);
  return { db, api, roomId: room.id, addPhoto };
}

const RESULT = () => ({ ...redesign.normalizeRedesign(answer()), layouts: redesign.normalizeRedesign(answer()).layouts.map((l) => ({ ...l, issues: [] })) });

test('the newest redesign comes with the room and turns stale when the plan changes', (t) => {
  const f = fixture(t);
  assert.equal(f.api.getRoomDetail(f.roomId, 'owner').redesign, null, 'no plan, no redesign');
  const { updatedAt } = f.api.putRoomBlueprint(f.roomId, 'owner', ROOM());
  assert.equal(f.api.saveRoomRedesign(f.roomId, 'stranger', updatedAt, RESULT()), null, 'someone else’s room');
  f.api.saveRoomRedesign(f.roomId, 'owner', updatedAt, { ...RESULT(), unseen: 'eski' });
  const saved = f.api.saveRoomRedesign(f.roomId, 'owner', updatedAt, RESULT());
  const detail = f.api.getRoomDetail(f.roomId, 'owner');
  assert.equal(detail.redesign.id, saved.id);
  assert.equal(detail.redesign.stale, false);
  assert.equal(detail.redesign.layouts.length, 3);
  f.db.prepare("UPDATE room_blueprints SET updated_at = '2099-01-01 00:00:00' WHERE room_id = ?").run(f.roomId);
  assert.equal(f.api.getRoomDetail(f.roomId, 'owner').redesign.stale, true);
});

test('the redesign input is the owner’s brief, plan and live photos only', (t) => {
  const f = fixture(t);
  assert.equal(f.api.getRedesignInput(f.roomId, 'stranger'), null);
  assert.deepEqual(JSON.parse(JSON.stringify(f.api.getRedesignInput(f.roomId, 'owner').photos)), []);
  assert.equal(f.api.getRedesignInput(f.roomId, 'owner').plan, null, 'no saved plan yet');
  f.api.putRoomBlueprint(f.roomId, 'owner', ROOM());
  const a = f.addPhoto(), b = f.addPhoto();
  f.addPhoto(f.api.createRoom('owner', 'Mutfak').id);
  f.api.deleteRoomPhoto(f.roomId, a, 'owner');
  const input = f.api.getRedesignInput(f.roomId, 'owner');
  assert.equal(input.room.name, 'Salon');
  assert.equal(input.plan.model.walls.length, 4);
  assert.deepEqual(input.photos.map((p) => p.id), [b]);
});

const ROUTE = 'app/api/rooms/[id]/redesign/route.js';
const FakeNextResponse = { json: (body, options) => ({ body, status: options?.status ?? 200 }) };
function loadRoute(f, { owner = 'owner', ai } = {}) {
  const code = fs.readFileSync(path.join(__dirname, '..', ROUTE), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const calls = [];
  const ctx = {
    NextResponse: FakeNextResponse, path, process: { cwd: () => '/app' }, console: { error() {} },
    fs: { readFile: async () => Buffer.from('jpeg-bytes') },
    getIdentity: async () => (owner ? { id: owner } : null),
    getRedesignInput: f.api.getRedesignInput, saveRoomRedesign: f.api.saveRoomRedesign, logEvent() {},
    MAX_REDESIGN_PHOTOS: 4, MAX_SUGGESTION_IMAGE_BYTES: 1000,
    roomRedesign: redesign,
    redesignRoom: async (images, room, planText, helpers) => {
      calls.push({ images, room, planText });
      const raw = ai ? ai() : answer();
      const result = helpers.normalize(raw);
      if (!result) throw new Error('invalid_redesign');
      const issues = helpers.check(result);
      return { ...result, layouts: result.layouts.map((l, i) => ({ ...l, issues: issues[i] })) };
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.POST=POST;', ctx);
  const post = (id) => ctx.POST({}, { params: Promise.resolve({ id: String(id) }) });
  return { post, calls };
}

test('the route needs an owned room with a plan and photos', async (t) => {
  const f = fixture(t);
  assert.equal((await loadRoute(f, { owner: null }).post(f.roomId)).status, 401);
  const { post, calls } = loadRoute(f);
  assert.equal((await post('1e3')).status, 400);
  assert.equal((await post(f.roomId)).body.error, 'plan_required');
  f.api.putRoomBlueprint(f.roomId, 'owner', ROOM());
  assert.equal((await post(f.roomId)).body.error, 'photos_required');
  assert.equal((await loadRoute(f, { owner: 'stranger' }).post(f.roomId)).status, 404);
  assert.equal(calls.length, 0, 'the AI is never asked before every check passes');
});

test('the route sends placed photos first, numbered as on the room screen, and saves the result', async (t) => {
  const f = fixture(t);
  const ids = [f.addPhoto(), f.addPhoto(), f.addPhoto(), f.addPhoto(), f.addPhoto()];
  const plan = ROOM();
  plan.photos = [{ id: 7, photoId: ids[3], x: 50, y: 250, angle: 315 }];
  f.api.putRoomBlueprint(f.roomId, 'owner', plan);
  const { post, calls } = loadRoute(f);
  const res = await post(f.roomId);
  assert.equal(res.status, 200);
  assert.deepEqual([...calls[0].images.map((i) => i.number)], [4, 1, 2, 3]);
  assert.match(calls[0].planText, /Fotoğraf 4: \(50, 250\)/);
  assert.deepEqual([...res.body.photos], [4, 1, 2, 3]);
  assert.equal(res.body.stale, false);
  assert.equal(f.api.getRoomDetail(f.roomId, 'owner').redesign.id, res.body.id);
});

test('a layout that still fails a check is saved with its issues, and a bad answer is a 502', async (t) => {
  const f = fixture(t);
  f.addPhoto();
  f.api.putRoomBlueprint(f.roomId, 'owner', ROOM());
  const blocked = GOOD_LAYOUT();
  blocked.items[1] = { key: 'k2', x: 200, y: 265, rotation: 0 };
  const res = await loadRoute(f, { ai: () => answer([blocked, GOOD_LAYOUT(), GOOD_LAYOUT()]) }).post(f.roomId);
  assert.deepEqual(res.body.layouts.map((l) => kinds(l.issues)), [['door'], [], []]);
  assert.equal((await loadRoute(f, { ai: () => ({ nonsense: true }) }).post(f.roomId)).status, 502);
});
