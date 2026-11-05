const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const realOpenaiImage = require('../lib/openaiImage.cjs');

// Same technique as tests/room-suggestions.test.cjs: the real lib/db.js on an
// isolated connection, never the user's real database.
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
  vm.runInContext(code + ';globalThis.api={createRoom,creations,roomSuggestions,getRoomDetail,getRoomsForDevice,getRoomName,getRoomPhotoFile,deleteRoomPhoto,logEvent};', ctx);
  return ctx.api;
}

const IDEAS = {
  seen: ['halıda giysiler', 'sehpada bardaklar'],
  summary: 'Zemin ve sehpa dolu.',
  ideas: [
    { area: 'ayiklama', title: 'Zemini boşalt', detail: 'Giysiler yatak odasına.' },
    { area: 'depolama', title: 'Battaniyeler sepete', detail: 'Hasır sepete katla.' },
  ],
};
const PLAN = { steps: ['Giysileri topla', 'Yatak odasına götür'], needs: [], difficulty: 'kolay', time: '10 dakika', budget: 'Bütçe gerekmez' };

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-ideas-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-ideas-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const room = api.createRoom('owner', 'Salon');
  const photo = api.creations.photo('owner', room.id, 'seed-photo', Buffer.from('fake-jpeg-bytes'), 'image/jpeg');
  const suggestion = api.roomSuggestions.create('owner', room.id, photo.id, IDEAS);
  return { db, api, directory, roomId: room.id, photoId: photo.id, suggestionId: suggestion.id };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

// ---------------- store ----------------

test('idea: only ideas that exist in an owned suggestion are found', t => {
  const f = fixture(t);
  const found = f.api.roomSuggestions.getIdea(f.suggestionId, 1, 'owner');
  assert.equal(found.idea.title, 'Battaniyeler sepete');
  assert.equal(found.plan, null);
  assert.deepEqual(found.messages, []);
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, 2, 'owner'), null, 'index past the end');
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, -1, 'owner'), null);
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, 0, 'stranger'), null, 'another device');
});

test('idea: the first saved plan wins, and a stranger cannot save one', t => {
  const f = fixture(t);
  assert.equal(f.api.roomSuggestions.savePlan(f.suggestionId, 0, 'stranger', PLAN), null);
  assert.deepEqual(plain(f.api.roomSuggestions.savePlan(f.suggestionId, 0, 'owner', PLAN)), PLAN);
  const later = { ...PLAN, steps: ['başka'] };
  assert.deepEqual(plain(f.api.roomSuggestions.savePlan(f.suggestionId, 0, 'owner', later)), PLAN, 'an overlapping second plan never replaces the one shown');
});

test('idea: its conversation is kept apart from the suggestion conversation', t => {
  const f = fixture(t);
  const messages = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }];
  assert.equal(f.api.roomSuggestions.saveIdeaMessages(f.suggestionId, 0, 'stranger', messages), false);
  assert.equal(f.api.roomSuggestions.saveIdeaMessages(f.suggestionId, 0, 'owner', messages), true);
  assert.deepEqual(plain(f.api.roomSuggestions.getIdea(f.suggestionId, 0, 'owner').messages), messages);
  assert.deepEqual(plain(f.api.roomSuggestions.getIdea(f.suggestionId, 1, 'owner').messages), []);
  assert.deepEqual(plain(f.api.roomSuggestions.get(f.suggestionId, 'owner').messages), [], 'suggestion-level chat untouched');
});

test('to-do: adding the same idea twice returns the same item; it appears in the room', t => {
  const f = fixture(t);
  const first = f.api.roomSuggestions.addTodo(f.suggestionId, 0, 'owner');
  const again = f.api.roomSuggestions.addTodo(f.suggestionId, 0, 'owner');
  assert.equal(first.id, again.id);
  assert.equal(first.title, 'Zemini boşalt');
  assert.equal(first.done, false);
  assert.equal(f.api.roomSuggestions.addTodo(f.suggestionId, 0, 'stranger'), null);
  assert.deepEqual(plain(f.api.getRoomDetail(f.roomId, 'owner').todos.map((todo) => todo.id)), [first.id]);
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, 0, 'owner').todo.id, first.id);
});

test('to-do: only the owner, under the right room, can tick or remove it; done items sort last', t => {
  const f = fixture(t);
  const a = f.api.roomSuggestions.addTodo(f.suggestionId, 0, 'owner');
  const b = f.api.roomSuggestions.addTodo(f.suggestionId, 1, 'owner');
  const otherRoom = f.api.createRoom('owner', 'Mutfak');
  assert.equal(f.api.roomSuggestions.setTodoDone(a.id, f.roomId, 'stranger', true), null);
  assert.equal(f.api.roomSuggestions.setTodoDone(a.id, otherRoom.id, 'owner', true), null);
  assert.equal(f.api.roomSuggestions.setTodoDone(a.id, f.roomId, 'owner', true).done, true);
  assert.deepEqual(plain(f.api.roomSuggestions.listTodos(f.roomId, 'owner').map((todo) => todo.id)), [b.id, a.id]);
  assert.equal(f.api.roomSuggestions.setTodoDone(a.id, f.roomId, 'owner', false).done, false);
  assert.equal(f.api.roomSuggestions.removeTodo(a.id, f.roomId, 'stranger'), false);
  assert.equal(f.api.roomSuggestions.removeTodo(a.id, f.roomId, 'owner'), true);
  assert.deepEqual(plain(f.api.roomSuggestions.listTodos(f.roomId, 'owner').map((todo) => todo.id)), [b.id]);
});

// ---------------- routes ----------------

function FakeNextResponse(body, init) { this.body = body; this.status = init?.status ?? 200; this.headers = init?.headers; }
FakeNextResponse.json = (body, options) => ({ body, status: options?.status ?? 200 });

function loadRoute(file, f, { owner = 'owner', account = true, suggestIdeaPlan, openaiImage } = {}) {
  const calls = { plan: 0, image: 0, lastPrompt: null };
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const fakeImage = {
    ...realOpenaiImage,
    generateTidyImage: async (source, sizeInfo, prompt) => {
      calls.image += 1;
      calls.lastPrompt = prompt;
      if (openaiImage?.fail) { const error = new Error('boom'); error.code = 'api_error'; throw error; }
      return { bytes: Buffer.from('generated-png') };
    },
    readImageDims: () => ({ width: 1600, height: 1200 }),
  };
  const ctx = {
    console, Buffer, NextResponse: FakeNextResponse,
    fs: require('fs/promises'), path, crypto: require('crypto'),
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner } : null),
    isAccountIdentity: () => account,
    roomSuggestions: f.api.roomSuggestions, getRoomName: f.api.getRoomName, logEvent: f.api.logEvent,
    getRoomPhotoFile: f.api.getRoomPhotoFile, deleteRoomPhoto: f.api.deleteRoomPhoto, NO_STORE: undefined,
    MAX_SUGGESTION_IMAGE_BYTES: 5 * 1024 * 1024,
    openaiImage: fakeImage,
    suggestIdeaPlan: async (...args) => {
      calls.plan += 1;
      calls.planArgs = args;
      return suggestIdeaPlan ? suggestIdeaPlan(...args) : PLAN;
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__route = { GET: typeof GET === "function" ? GET : null, POST: typeof POST === "function" ? POST : null, PATCH: typeof PATCH === "function" ? PATCH : null, DELETE: typeof DELETE === "function" ? DELETE : null };', ctx);
  return { route: ctx.__route, calls };
}

const IDEA_ROUTE = 'app/api/rooms/[id]/suggestions/[suggestionId]/ideas/[ideaIndex]/route.js';
const ideaParams = (f, overrides = {}) => ({ params: Promise.resolve({ id: String(f.roomId), suggestionId: String(f.suggestionId), ideaIndex: '0', ...overrides }) });

test('idea route: opening is free; the plan is made once, then served from the saved copy', async t => {
  const f = fixture(t);
  const { route, calls } = loadRoute(IDEA_ROUTE, f);
  const opened = await route.GET({}, ideaParams(f));
  assert.equal(opened.status, 200);
  assert.equal(opened.body.plan, null);
  assert.equal(calls.plan, 0, 'opening never calls the AI');

  const planned = await route.POST({}, ideaParams(f));
  assert.equal(planned.status, 200);
  assert.deepEqual(plain(planned.body.plan), PLAN);
  assert.equal(calls.plan, 1);
  assert.equal(Buffer.from(calls.planArgs[0].base64, 'base64').toString(), 'fake-jpeg-bytes', 'the stored room photo');
  assert.equal(calls.planArgs[3], 0, 'the idea index comes from the URL, checked against the stored suggestion');

  const again = await route.POST({}, ideaParams(f));
  assert.deepEqual(plain(again.body.plan), PLAN);
  assert.equal(calls.plan, 1, 'no second AI call once a plan is saved');
});

test('idea route: other rooms, other users and missing ideas are not found, with no AI call', async t => {
  const f = fixture(t);
  const otherRoom = f.api.createRoom('owner', 'Mutfak');
  for (const [opts, params] of [
    [{ owner: 'stranger' }, ideaParams(f)],
    [{}, ideaParams(f, { id: String(otherRoom.id) })],
    [{}, ideaParams(f, { ideaIndex: '9' })],
  ]) {
    const { route, calls } = loadRoute(IDEA_ROUTE, f, opts);
    assert.equal((await route.POST({}, params)).status, 404);
    assert.equal(calls.plan, 0);
  }
  const { route } = loadRoute(IDEA_ROUTE, f, { owner: null });
  assert.equal((await route.GET({}, ideaParams(f))).status, 401);
});

test('idea route: a failed plan is reported and nothing is saved', async t => {
  const f = fixture(t);
  const { route } = loadRoute(IDEA_ROUTE, f, { suggestIdeaPlan: async () => { throw new Error('invalid_idea_plan'); } });
  const res = await route.POST({}, ideaParams(f));
  assert.equal(res.status, 502);
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, 0, 'owner').plan, null);
});

test('to-do routes: add, tick and remove go through ownership checks', async t => {
  const f = fixture(t);
  const add = loadRoute('app/api/rooms/[id]/suggestions/[suggestionId]/ideas/[ideaIndex]/todo/route.js', f);
  const added = await add.route.POST({}, ideaParams(f));
  assert.equal(added.status, 200);
  const stranger = loadRoute('app/api/rooms/[id]/suggestions/[suggestionId]/ideas/[ideaIndex]/todo/route.js', f, { owner: 'stranger' });
  assert.equal((await stranger.route.POST({}, ideaParams(f))).status, 404);

  const todoParams = { params: Promise.resolve({ id: String(f.roomId), todoId: String(added.body.id) }) };
  const owner = loadRoute('app/api/rooms/[id]/todos/[todoId]/route.js', f);
  assert.equal((await owner.route.PATCH({ json: async () => ({ done: 'yes' }) }, todoParams)).status, 400);
  const ticked = await owner.route.PATCH({ json: async () => ({ done: true }) }, todoParams);
  assert.equal(ticked.body.done, true);
  const other = loadRoute('app/api/rooms/[id]/todos/[todoId]/route.js', f, { owner: 'stranger' });
  assert.equal((await other.route.PATCH({ json: async () => ({ done: false }) }, todoParams)).status, 404);
  assert.equal((await other.route.DELETE({}, todoParams)).status, 404);
  assert.equal((await owner.route.DELETE({}, todoParams)).status, 200);
  assert.deepEqual(plain(f.api.roomSuggestions.listTodos(f.roomId, 'owner')), []);
});

const VISUAL_ROUTE = 'app/api/rooms/[id]/suggestions/[suggestionId]/ideas/[ideaIndex]/visual/route.js';
const postVisual = (route, f, key = 'visual-key-1', overrides) => route.POST({ json: async () => ({ operationKey: key }) }, ideaParams(f, overrides));

test('visual route: a guest is refused before any claim or paid call', async t => {
  const f = fixture(t);
  const { route, calls } = loadRoute(VISUAL_ROUTE, f, { account: false });
  const res = await postVisual(route, f);
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'account_required');
  assert.equal(calls.image, 0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM room_idea_visuals').get().n, 0);
});

test('visual route: one paid call that applies only the chosen idea; a resubmission replays it', async t => {
  const f = fixture(t);
  const { route, calls } = loadRoute(VISUAL_ROUTE, f);
  const first = await postVisual(route, f);
  assert.equal(first.status, 200);
  assert.equal(first.body.status, 'completed');
  assert.equal(calls.image, 1);
  assert.match(calls.lastPrompt, /Zemini boşalt — Giysiler yatak odasına\./, 'the stored idea, not client text');
  assert.ok(!calls.lastPrompt.includes('Battaniyeler'), 'only the chosen idea');

  const replay = await postVisual(route, f);
  assert.equal(replay.body.id, first.body.id);
  assert.equal(calls.image, 1, 'the same operation key never pays twice');

  const conflict = await postVisual(route, f, 'visual-key-1', { ideaIndex: '1' });
  assert.equal(conflict.status, 409, 'a key reused for a different idea is rejected');
  assert.equal(calls.image, 1);
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, 0, 'owner').visual.id, first.body.id);
});

test('visual route: a failed generation is recorded, not faked as success', async t => {
  const f = fixture(t);
  const { route } = loadRoute(VISUAL_ROUTE, f, { openaiImage: { fail: true } });
  const res = await postVisual(route, f);
  assert.equal(res.status, 502);
  assert.equal(f.db.prepare('SELECT status FROM room_idea_visuals').get().status, 'failed');
  assert.equal(f.api.roomSuggestions.getIdea(f.suggestionId, 0, 'owner').visual, null);
});

test('visual file route: served only to its owner, only once completed, only under its suggestion', async t => {
  const f = fixture(t);
  const { route } = loadRoute(VISUAL_ROUTE, f);
  const made = await postVisual(route, f);
  const fileRoute = 'app/api/rooms/[id]/suggestions/[suggestionId]/ideas/[ideaIndex]/visual/[visualId]/route.js';
  const params = (suggestionId) => ({ params: Promise.resolve({ id: String(f.roomId), suggestionId: String(suggestionId), ideaIndex: '0', visualId: String(made.body.id) }) });
  const ok = await loadRoute(fileRoute, f).route.GET({}, params(f.suggestionId));
  assert.equal(ok.status, 200);
  assert.equal(Buffer.from(ok.body).toString(), 'generated-png');
  assert.equal((await loadRoute(fileRoute, f, { owner: 'stranger' }).route.GET({}, params(f.suggestionId))).status, 404);
  assert.equal((await loadRoute(fileRoute, f).route.GET({}, params(f.suggestionId + 1))).status, 404);
});

test('idea visual prompt keeps Toparla\'s default untouched', () => {
  const prompt = realOpenaiImage.buildIdeaVisualPrompt({ title: 'Başlık', detail: 'Ayrıntı' });
  assert.match(prompt, /"Başlık — Ayrıntı"/);
  assert.match(prompt, /Preserve the exact room/);
  assert.notEqual(prompt, realOpenaiImage.TOPARLA_PROMPT);
  assert.equal(realOpenaiImage.generateTidyImage.length, 2, 'the prompt parameter is optional; Toparla callers pass two arguments');
});

// ---------------- suggestIdeaPlan (lib/anthropic.js) ----------------

function loadSuggestIdeaPlan(reply, stopReason = 'end_turn') {
  const sent = [];
  function FakeAnthropic() {
    this.messages = { create: async (request) => { sent.push(request); return { content: [{ type: 'text', text: reply }], stop_reason: stopReason }; } };
    this.beta = { messages: this.messages };
  }
  const code = fs.readFileSync(path.join(__dirname, '../lib/anthropic.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = {
    Anthropic: FakeAnthropic, roomItemSources: {}, MAX_ROOM_PHOTOS: 6, SESTIA_VOICE_COMPASS: 'x',
    chatContext: require('../lib/chatContext.cjs'),
    process: { env: { ANTHROPIC_API_KEY: 'test', ANTHROPIC_MODEL: 'test' } }, console,
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__fn = suggestIdeaPlan;', ctx);
  return { suggestIdeaPlan: ctx.__fn, sent };
}

const IMAGE = { base64: 'aGVsbG8=', mediaType: 'image/jpeg' };

test('suggestIdeaPlan: a valid plan is trimmed; the stored idea and what Sestia saw go in the user turn', async () => {
  const { suggestIdeaPlan, sent } = loadSuggestIdeaPlan(JSON.stringify({ ...PLAN, steps: ['  Giysileri topla  '] }));
  const plan = await suggestIdeaPlan(IMAGE, 'Salon', IDEAS, 0);
  assert.deepEqual(plain(plan.steps), ['Giysileri topla']);
  const text = sent[0].messages[0].content[1].text;
  assert.match(text, /Seçilen öneri: Zemini boşalt — Giysiler yatak odasına\./);
  assert.match(text, /- halıda giysiler/);
  assert.equal(sent[0].output_config.effort, 'low');
});

test('suggestIdeaPlan: malformed plans and impossible ideas are rejected', async () => {
  for (const bad of [
    { ...PLAN, difficulty: 'çok kolay' },
    { ...PLAN, steps: [] },
    { ...PLAN, steps: Array.from({ length: 7 }, () => 'adım') },
    { ...PLAN, needs: [''] },
    { ...PLAN, budget: '' },
  ]) {
    const { suggestIdeaPlan } = loadSuggestIdeaPlan(JSON.stringify(bad));
    await assert.rejects(suggestIdeaPlan(IMAGE, 'Salon', IDEAS, 0), /invalid_idea_plan/);
  }
  const { suggestIdeaPlan } = loadSuggestIdeaPlan(JSON.stringify(PLAN));
  await assert.rejects(suggestIdeaPlan(IMAGE, 'Salon', IDEAS, 5), /invalid_plan_request/);
});

// ---------------- deleting a room photo ----------------

const PHOTO_ROUTE = 'app/api/rooms/[id]/photos/[photoId]/route.js';
const photoParams = (f, photoId, roomId = f.roomId) => ({ params: Promise.resolve({ id: String(roomId), photoId: String(photoId) }) });

test('photo delete: only the owner, only under its room; the file goes, the cover moves on, suggestions stay', async t => {
  const f = fixture(t);
  const second = f.api.creations.photo('owner', f.roomId, 'second-photo', Buffer.from('second'), 'image/jpeg');
  const firstFile = path.join(f.directory, 'data', 'room-photos', f.api.getRoomPhotoFile(f.photoId, 'owner').filename);
  assert.ok(fs.existsSync(firstFile));

  const otherRoom = f.api.createRoom('owner', 'Mutfak');
  assert.equal((await loadRoute(PHOTO_ROUTE, f, { owner: 'stranger' }).route.DELETE({}, photoParams(f, f.photoId))).status, 404);
  assert.equal((await loadRoute(PHOTO_ROUTE, f).route.DELETE({}, photoParams(f, f.photoId, otherRoom.id))).status, 404);
  assert.equal((await loadRoute(PHOTO_ROUTE, f, { owner: null }).route.DELETE({}, photoParams(f, f.photoId))).status, 401);
  assert.ok(fs.existsSync(firstFile), 'nothing deleted by refused requests');

  const res = await loadRoute(PHOTO_ROUTE, f).route.DELETE({}, photoParams(f, f.photoId));
  assert.equal(res.status, 200);
  assert.ok(!fs.existsSync(firstFile), 'the file is removed from disk');
  const detail = f.api.getRoomDetail(f.roomId, 'owner');
  assert.deepEqual(plain(detail.photos.map((p) => p.id)), [second.id]);
  assert.equal(f.db.prepare('SELECT cover_photo_id AS c FROM rooms WHERE id = ?').get(f.roomId).c, second.id, 'the next photo becomes the cover');
  assert.equal(f.api.roomSuggestions.get(f.suggestionId, 'owner').sourcePhotoId, f.photoId, 'the suggestion made from it is kept');
  assert.ok(f.db.prepare('SELECT deleted_at AS d FROM room_photos WHERE id = ?').get(f.photoId).d, 'the row is only marked, so foreign keys to it still hold');
  assert.equal(f.api.getRoomPhotoFile(f.photoId, 'owner'), undefined, 'a deleted photo is no longer served');
  assert.equal(f.api.getRoomsForDevice('owner').find((r) => r.id === f.roomId).coverPhotoId, second.id, 'the room card shows the next photo');
  assert.equal((await loadRoute(PHOTO_ROUTE, f).route.DELETE({}, photoParams(f, f.photoId))).status, 404, 'already gone');
});

test('photo delete: the plan falls back to the room\'s other photos; with none left it says so', async t => {
  const f = fixture(t);
  const second = f.api.creations.photo('owner', f.roomId, 'second-photo', Buffer.from('second-bytes'), 'image/jpeg');
  f.api.deleteRoomPhoto(f.roomId, f.photoId, 'owner');
  const { route, calls } = loadRoute(IDEA_ROUTE, f);
  const planned = await route.POST({}, ideaParams(f));
  assert.equal(planned.status, 200);
  assert.equal(Buffer.from(calls.planArgs[0].base64, 'base64').toString(), 'second-bytes');

  f.api.deleteRoomPhoto(f.roomId, second.id, 'owner');
  const { route: route2, calls: calls2 } = loadRoute(IDEA_ROUTE, f);
  const none = await route2.POST({}, ideaParams(f, { ideaIndex: '1' }));
  assert.equal(none.status, 409);
  assert.equal(none.body.error, 'photo_deleted');
  assert.equal(calls2.plan, 0);
});

test('photo delete: "Nasıl görünür?" on an idea whose photo was deleted says so, with no claim and no paid call', async t => {
  const f = fixture(t);
  f.api.deleteRoomPhoto(f.roomId, f.photoId, 'owner');
  const { route, calls } = loadRoute(VISUAL_ROUTE, f);
  const res = await postVisual(route, f);
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'photo_deleted');
  assert.equal(calls.image, 0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM room_idea_visuals').get().n, 0);
});
