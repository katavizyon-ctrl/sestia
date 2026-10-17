const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Database = require('better-sqlite3');

// Same technique as tests/toparla.test.cjs's loadApi: the real lib/db.js
// against an isolated connection, never the user's real database.
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
  vm.runInContext(code + ';globalThis.api={createRoom,creations,roomSuggestions,getRoomDetail,getRoomName,getRoomBrief,setRoomGoal,updateRoomBrief,ROOM_BRIEF_LIMITS,logEvent};', ctx);
  return ctx.api;
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-suggestions-'));
  const db = new Database(path.join(directory, 'isolated.db'));
  const api = loadApi(db);
  t.after(() => {
    db.close();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('sestia-suggestions-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const room = api.createRoom('owner', 'Salon');
  const photo = api.creations.photo('owner', room.id, 'seed-photo', Buffer.from('fake-jpeg-bytes'), 'image/jpeg');
  return { db, api, directory, roomId: room.id, photoId: photo.id };
}

const IDEAS = {
  seen: ['pencere önünde krem kanepe', 'sağda boş köşe'],
  summary: 'Pencere tarafı aydınlık, karşı köşe boş kalmış.',
  ideas: [
    { phase: 'baslangic', area: 'ayiklama', title: 'Önce kapı önünü aç', detail: 'Kapı önündeki torbaları koridora al.', how: ['Torbaları topla'], time: '15 dakika' },
    { phase: 'sonra', area: 'isik', title: 'Köşeye ayaklı lamba', detail: 'Boş köşeye sıcak ışıklı bir lamba.' },
  ],
};

function FakeNextResponse() {}
FakeNextResponse.json = (body, options) => ({ body, status: options?.status ?? 200 });

function loadRoute(file, f, { owner = 'owner', suggestRoomIdeas, maxBytes = 5 * 1024 * 1024 } = {}) {
  const calls = { suggest: 0, lastArgs: null };
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = {
    console, Buffer, NextResponse: FakeNextResponse,
    fs: require('fs/promises'), path,
    process: { cwd: () => f.directory },
    getIdentity: async () => (owner ? { id: owner } : null),
    roomSuggestions: f.api.roomSuggestions, getRoomName: f.api.getRoomName, getRoomBrief: f.api.getRoomBrief, logEvent: f.api.logEvent,
    MAX_SUGGESTION_IMAGE_BYTES: maxBytes, MAX_SUGGESTION_PHOTOS: 4,
    suggestRoomIdeas: async (...args) => {
      calls.suggest += 1;
      calls.lastArgs = args;
      return suggestRoomIdeas ? suggestRoomIdeas(...args) : IDEAS;
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__route = { POST: typeof POST === "function" ? POST : null, GET: typeof GET === "function" ? GET : null };', ctx);
  return { route: ctx.__route, calls };
}

const postSuggestion = (f, roomId, body, opts) => {
  const { route, calls } = loadRoute('app/api/rooms/[id]/suggestions/route.js', f, opts);
  return route.POST({ json: async () => body }, { params: Promise.resolve({ id: String(roomId) }) }).then((res) => ({ res, calls }));
};

// ---------------- store ----------------

test('store: a suggestion can only be created for a room and photo the device owns', t => {
  const f = fixture(t);
  assert.equal(f.api.roomSuggestions.create('stranger', f.roomId, f.photoId, IDEAS), null, 'not the owner of the room/photo');
  const otherRoom = f.api.createRoom('owner', 'Mutfak');
  assert.equal(f.api.roomSuggestions.create('owner', otherRoom.id, f.photoId, IDEAS), null, 'photo belongs to a different room');

  const created = f.api.roomSuggestions.create('owner', f.roomId, f.photoId, IDEAS);
  assert.equal(created.roomId, f.roomId);
  assert.equal(created.sourcePhotoId, f.photoId);
  assert.equal(created.summary, IDEAS.summary);
  assert.deepEqual(created.seen, IDEAS.seen);
  assert.deepEqual(created.ideas, IDEAS.ideas);
  assert.deepEqual(created.messages, []);
});

test('store: suggestions and their conversations are never visible to another device', t => {
  const f = fixture(t);
  const created = f.api.roomSuggestions.create('owner', f.roomId, f.photoId, IDEAS);
  assert.equal(f.api.roomSuggestions.get(created.id, 'stranger'), null);
  assert.deepEqual(f.api.roomSuggestions.listForRoom(f.roomId, 'stranger'), []);
  assert.equal(f.api.roomSuggestions.saveMessages(created.id, 'stranger', [{ role: 'user', content: 'x' }]), false);
  assert.deepEqual(f.api.roomSuggestions.get(created.id, 'owner').messages, [], 'a stranger cannot write into the owner\'s conversation');
});

test('store: saved conversation is returned when one suggestion is opened, not in the room list', t => {
  const f = fixture(t);
  const created = f.api.roomSuggestions.create('owner', f.roomId, f.photoId, IDEAS);
  const messages = [{ role: 'user', content: 'Lamba fikrini aç' }, { role: 'assistant', content: 'Sıcak beyaz bir ampul seç.' }];
  assert.equal(f.api.roomSuggestions.saveMessages(created.id, 'owner', messages), true);
  assert.deepEqual(f.api.roomSuggestions.get(created.id, 'owner').messages, messages);

  const [listed] = f.api.getRoomDetail(f.roomId, 'owner').suggestions;
  assert.equal(listed.id, created.id);
  assert.equal(listed.messageCount, 2);
  assert.equal(listed.messages, undefined, 'the room detail list stays light');
});

test('store: room detail lists suggestions newest first', t => {
  const f = fixture(t);
  const first = f.api.roomSuggestions.create('owner', f.roomId, f.photoId, IDEAS);
  const second = f.api.roomSuggestions.create('owner', f.roomId, f.photoId, { summary: 'İkinci bakış.', ideas: [] });
  assert.deepEqual(f.api.getRoomDetail(f.roomId, 'owner').suggestions.map((s) => s.id), [second.id, first.id]);
});

// ---------------- POST /api/rooms/[id]/suggestions ----------------

test('route: unauthenticated request is rejected before any AI call', async t => {
  const f = fixture(t);
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: f.photoId }, { owner: null });
  assert.equal(res.status, 401);
  assert.equal(calls.suggest, 0);
});

test('route: a photo the identity does not own is not found and never reaches the AI', async t => {
  const f = fixture(t);
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: f.photoId }, { owner: 'stranger' });
  assert.equal(res.status, 404);
  assert.equal(calls.suggest, 0);
  assert.deepEqual(f.api.roomSuggestions.listForRoom(f.roomId, 'owner'), []);
});

test('route: happy path sends the stored photo bytes and room name, saves and returns the ideas', async t => {
  const f = fixture(t);
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: f.photoId });
  assert.equal(res.status, 200);
  assert.equal(calls.suggest, 1, 'exactly one AI call');
  const [images, room] = calls.lastArgs;
  assert.equal(images.length, 1, 'the room has one photo');
  const [image] = images;
  assert.equal(Buffer.from(image.base64, 'base64').toString(), 'fake-jpeg-bytes', 'bytes come from the stored room photo');
  assert.equal(image.mediaType, 'image/jpeg');
  assert.equal(room.name, 'Salon');
  assert.equal(room.goal, null, 'no goal written yet');
  assert.deepEqual(res.body.ideas, IDEAS.ideas);
  assert.equal(f.api.roomSuggestions.get(res.body.id, 'owner').summary, IDEAS.summary, 'persisted');
});

test('route: an AI failure is reported and nothing is saved', async t => {
  const f = fixture(t);
  const { res } = await postSuggestion(f, f.roomId, { photoId: f.photoId }, { suggestRoomIdeas: async () => { throw new Error('invalid_room_ideas'); } });
  assert.equal(res.status, 502);
  assert.equal(res.body.error, 'suggestion_failed');
  assert.deepEqual(f.api.roomSuggestions.listForRoom(f.roomId, 'owner'), []);
});

test('route: a photo larger than the AI image limit is refused before any AI call', async t => {
  const f = fixture(t);
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: f.photoId }, { maxBytes: 4 });
  assert.equal(res.status, 422);
  assert.equal(res.body.error, 'photo_too_large');
  assert.equal(calls.suggest, 0);
});

test('route: malformed ids are rejected', async t => {
  const f = fixture(t);
  assert.equal((await postSuggestion(f, 'abc', { photoId: f.photoId })).res.status, 400);
  assert.equal((await postSuggestion(f, f.roomId, { photoId: 'x' })).res.status, 400);
});

// ---------------- GET /api/rooms/[id]/suggestions/[suggestionId] ----------------

test('reopen route: owner gets the suggestion with its conversation; other rooms and devices get 404', async t => {
  const f = fixture(t);
  const created = f.api.roomSuggestions.create('owner', f.roomId, f.photoId, IDEAS);
  f.api.roomSuggestions.saveMessages(created.id, 'owner', [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]);
  const get = async (roomId, owner) => {
    const { route } = loadRoute('app/api/rooms/[id]/suggestions/[suggestionId]/route.js', f, { owner });
    return route.GET({}, { params: Promise.resolve({ id: String(roomId), suggestionId: String(created.id) }) });
  };
  const ok = await get(f.roomId, 'owner');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.messages.length, 2);

  const otherRoom = f.api.createRoom('owner', 'Mutfak');
  assert.equal((await get(otherRoom.id, 'owner')).status, 404, 'served only under its own room');
  assert.equal((await get(f.roomId, 'stranger')).status, 404);
  assert.equal((await get(f.roomId, null)).status, 401);
});

// ---------------- suggestRoomIdeas (lib/anthropic.js) ----------------

// Loads the real lib/anthropic.js with a fake SDK that returns `reply` — no
// network call ever happens.
function loadSuggestRoomIdeas(reply, stopReason = 'end_turn') {
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
  vm.runInContext(code + ';globalThis.__fn = suggestRoomIdeas;', ctx);
  return { suggestRoomIdeas: ctx.__fn, sent };
}

const IMAGE = { base64: 'aGVsbG8=', mediaType: 'image/jpeg' };

test('suggestRoomIdeas: a valid answer is trimmed and returned; the room name goes in the user turn, not the system prompt', async () => {
  const { suggestRoomIdeas, sent } = loadSuggestRoomIdeas(JSON.stringify({
    seen: ['  masada kağıt yığını  '],
    summary: '  Aydınlık bir oda.  ',
    ideas: [{ phase: 'sonra', area: 'renk', title: ' Sıcak tonlar ', detail: ' Yastıklarda hardal. ' }],
  }));
  const result = await suggestRoomIdeas(IMAGE, 'Çalışma <odası>');
  assert.deepEqual(JSON.parse(JSON.stringify(result.seen)), ['masada kağıt yığını']);
  assert.equal(result.summary, 'Aydınlık bir oda.');
  assert.deepEqual(JSON.parse(JSON.stringify(result.ideas)), [{ phase: 'sonra', area: 'renk', title: 'Sıcak tonlar', detail: 'Yastıklarda hardal.' }]);
  assert.ok(!sent[0].system.includes('Çalışma <odası>'));
  assert.match(sent[0].messages[0].content[1].text, /Çalışma <odası>/);
  assert.equal(sent[0].messages[0].content[0].source.data, IMAGE.base64);
});

test('suggestRoomIdeas: an unsuitable photo may return no ideas, with a reason in the summary', async () => {
  const { suggestRoomIdeas } = loadSuggestRoomIdeas(JSON.stringify({ seen: [], summary: 'Fotoğraf çok karanlık.', ideas: [] }));
  const result = await suggestRoomIdeas(IMAGE, 'Salon');
  assert.equal(result.ideas.length, 0);
});

test('suggestRoomIdeas: malformed or truncated answers are rejected, never half-saved', async () => {
  const bad = [
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ phase: 'sonra', area: 'sat', title: 'a', detail: 'b' }] }), // per-item verdict, not an area
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ phase: 'sonra', area: 'diy', title: 'a', detail: 'b' }] }), // DIY is a separate feature now
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ area: 'renk', title: 'a', detail: 'b' }] }), // which section it belongs to is required
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ phase: 'simdi', area: 'renk', title: 'a', detail: 'b' }] }),
    JSON.stringify({ seen: [], summary: '', ideas: [] }),
    JSON.stringify({ summary: 'x', ideas: [] }), // what it saw is required
    JSON.stringify({ seen: [''], summary: 'x', ideas: [] }),
    JSON.stringify({ seen: [], summary: 'x', ideas: Array.from({ length: 11 }, () => ({ phase: 'sonra', area: 'renk', title: 'a', detail: 'b' })) }),
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ phase: 'sonra', area: 'renk', title: 'a' }] }),
    'not json',
  ];
  for (const reply of bad) {
    const { suggestRoomIdeas } = loadSuggestRoomIdeas(reply);
    await assert.rejects(suggestRoomIdeas(IMAGE, 'Salon'), /invalid_room_ideas/, reply);
  }
  const { suggestRoomIdeas } = loadSuggestRoomIdeas(JSON.stringify({ seen: [], summary: 'x', ideas: [] }), 'max_tokens');
  await assert.rejects(suggestRoomIdeas(IMAGE, 'Salon'), /invalid_room_ideas/);
});


test('suggestRoomIdeas: requests carry an explicit effort, room for thinking, and the refusal fallback opt-in', async () => {
  const { suggestRoomIdeas, sent } = loadSuggestRoomIdeas(JSON.stringify({ seen: ['x'], summary: 'y', ideas: [] }));
  await suggestRoomIdeas(IMAGE, 'Salon');
  assert.equal(sent[0].output_config.effort, 'medium');
  assert.ok(sent[0].max_tokens >= 16000, 'thinking counts toward max_tokens on Claude Opus 5.5');
  assert.equal(sent[0].fallbacks, 'default');
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0].betas)), ['server-side-fallback-2026-07-01']);
  assert.equal(sent[0].thinking, undefined, 'thinking cannot be disabled on Claude Opus 5.5, so it is never sent');
});

test('suggestRoomIdeas: a refusal that survives the fallback is an error, not an empty answer', async () => {
  const { suggestRoomIdeas } = loadSuggestRoomIdeas('', 'refusal');
  await assert.rejects(suggestRoomIdeas(IMAGE, 'Salon'), /model_refused/);
});

test('store: a table created before "seen" existed gets the column, and old rows read as an empty list', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-suggestions-'));
  const db = new Database(path.join(directory, 'legacy.db'));
  t.after(() => { db.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  db.exec(`CREATE TABLE room_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, device_id TEXT NOT NULL,
    source_photo_id INTEGER NOT NULL, summary TEXT NOT NULL, ideas_json TEXT NOT NULL,
    messages_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.prepare("INSERT INTO room_suggestions (room_id, device_id, source_photo_id, summary, ideas_json) VALUES (1, 'owner', 1, 'eski', '[]')").run();
  const store = require('../lib/roomSuggestionStore.cjs').createRoomSuggestionStore(db);
  assert.deepEqual(store.get(1, 'owner').seen, []);
  assert.ok(db.prepare('PRAGMA table_info(room_suggestions)').all().some((c) => c.name === 'seen_json'));
});


test('suggestRoomIdeas: the room goal and story go in the user turn, and "where to start" always comes first', async () => {
  const { suggestRoomIdeas, sent } = loadSuggestRoomIdeas(JSON.stringify({
    seen: ['yerde torbalar'],
    summary: 'Eski atölye.',
    ideas: [
      { phase: 'sonra', area: 'yerlesim', title: 'Masayı pencereye dik koy', detail: 'Ekran yansımasın.' },
      { phase: 'baslangic', area: 'ayiklama', title: 'Kapı önünü aç', detail: 'İlk 15 dakika.', how: ['Torbaları kapının yanına taşı'], time: '15 dakika' },
      { phase: 'baslangic', area: 'ayiklama', title: 'Kartonları ayır', detail: 'Geri dönüşüme.', how: ['Yassıla', 'Üst üste koy'], time: '20 dakika' },
    ],
  }));
  const result = await suggestRoomIdeas(IMAGE, { name: 'Atölye', goal: 'seramik stüdyosu', story: 'eskiden mixed media atölyesiydi' });
  assert.deepEqual(JSON.parse(JSON.stringify(result.ideas.map((idea) => idea.title))), ['Kapı önünü aç', 'Kartonları ayır', 'Masayı pencereye dik koy']);
  const text = sent[0].messages[0].content[1].text;
  assert.match(text, /Kullanıcının bu oda için hedefi: seramik stüdyosu/);
  assert.match(text, /Odanın hikâyesi: eskiden mixed media atölyesiydi/);
  assert.ok(!sent[0].system.includes('seramik stüdyosu') && !sent[0].system.includes('mixed media atölyesiydi'), 'user text never enters the system prompt');

  const { suggestRoomIdeas: withoutGoal, sent: sent2 } = loadSuggestRoomIdeas(JSON.stringify({ seen: [], summary: 'x', ideas: [] }));
  await withoutGoal(IMAGE, { name: 'Salon', goal: null, story: null });
  assert.match(sent2[0].messages[0].content[1].text, /bir hedef yazmadı/);
});

test('route: the room goal is read from the room and kept with the suggestion it shaped', async t => {
  const f = fixture(t);
  f.api.setRoomGoal(f.roomId, 'owner', { goal: 'dijital atölye', story: 'eskiden mixed media atölyesiydi' });
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: f.photoId, goal: 'istemciden gelen başka hedef' });
  assert.equal(res.status, 200);
  assert.equal(calls.lastArgs[1].goal, 'dijital atölye', 'from the owned room row, never from the request body');
  assert.equal(res.body.goal, 'dijital atölye');
  f.api.setRoomGoal(f.roomId, 'owner', { goal: 'misafir odası', story: '' });
  assert.equal(f.api.roomSuggestions.get(res.body.id, 'owner').goal, 'dijital atölye', 'a later goal change never rewrites an old suggestion');
});

test('room goal route: owner can set and clear it; others and bad input are refused', async t => {
  const f = fixture(t);
  const code = fs.readFileSync(path.join(__dirname, '../app/api/rooms/[id]/route.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const load = (owner) => {
    const ctx = {
      console, NextResponse: FakeNextResponse,
      getIdentity: async () => (owner ? { id: owner } : null),
      getRoomDetail: f.api.getRoomDetail, updateRoomBrief: f.api.updateRoomBrief, ROOM_BRIEF_LIMITS: f.api.ROOM_BRIEF_LIMITS,
    };
    vm.createContext(ctx);
    vm.runInContext(code + ';globalThis.__patch = PATCH;', ctx);
    return (body) => ctx.__patch({ json: async () => body }, { params: Promise.resolve({ id: String(f.roomId) }) });
  };
  const owner = load('owner');
  const saved = await owner({ goal: '  dijital atölye  ', story: 'eski atölye' });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.goal, 'dijital atölye');
  assert.equal(f.api.getRoomDetail(f.roomId, 'owner').story, 'eski atölye');
  assert.equal((await owner({ goal: '', story: '' })).body.goal, null, 'empty text clears the field');
  assert.equal((await owner({ goal: 42 })).status, 400);
  assert.equal((await owner({ goal: 'x'.repeat(201) })).status, 400, 'too long is refused, not silently cut');
  assert.equal((await load('stranger')({ goal: 'başkasının odası' })).status, 404);
  assert.equal(f.api.getRoomDetail(f.roomId, 'owner').goal, null);
  assert.equal((await load(null)({ goal: 'x' })).status, 401);
});


test('suggestRoomIdeas: a start step must say how and how long; several photos of one room are sent together', async () => {
  for (const bad of [
    { phase: 'baslangic', area: 'ayiklama', title: 'Topla', detail: 'x', time: '10 dakika' }, // no how
    { phase: 'baslangic', area: 'ayiklama', title: 'Topla', detail: 'x', how: [], time: '10 dakika' },
    { phase: 'baslangic', area: 'ayiklama', title: 'Topla', detail: 'x', how: ['a'] }, // no time
    { phase: 'baslangic', area: 'ayiklama', title: 'Topla', detail: 'x', how: ['a', 'b', 'c', 'd', 'e', 'f'], time: '1 saat' },
  ]) {
    const { suggestRoomIdeas } = loadSuggestRoomIdeas(JSON.stringify({ seen: [], summary: 'x', ideas: [bad] }));
    await assert.rejects(suggestRoomIdeas(IMAGE, 'Salon'), /invalid_room_ideas/, JSON.stringify(bad));
  }

  const { suggestRoomIdeas, sent } = loadSuggestRoomIdeas(JSON.stringify({
    seen: ['yerde karton'], missing: '  Sağ köşedeki rafların içi görünmüyor; oradan bir fotoğraf ekler misin?  ', summary: 'x',
    ideas: [{ phase: 'baslangic', area: 'ayiklama', title: 'Kartonlar', detail: 'x', how: [' Yassıla '], time: ' 20 dakika ' }],
  }));
  const result = await suggestRoomIdeas([IMAGE, { base64: 'aWtpbmNp', mediaType: 'image/png' }], 'Salon');
  assert.equal(result.missing, 'Sağ köşedeki rafların içi görünmüyor; oradan bir fotoğraf ekler misin?');
  assert.deepEqual(JSON.parse(JSON.stringify(result.ideas[0].how)), ['Yassıla']);
  assert.equal(result.ideas[0].time, '20 dakika');
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0].messages[0].content.filter((block) => block.type === 'image').map((block) => block.source.data))), ['aGVsbG8=', 'aWtpbmNp']);
  await assert.rejects(suggestRoomIdeas([IMAGE, IMAGE, IMAGE, IMAGE, IMAGE], 'Salon'), /invalid_image/, 'at most four photos');
});

test('route: the chosen photo goes first, the room\'s other photos follow, and "missing" is saved', async t => {
  const f = fixture(t);
  const second = f.api.creations.photo('owner', f.roomId, 'second-photo', Buffer.from('second-bytes'), 'image/png');
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: second.id }, {
    suggestRoomIdeas: async () => ({ ...IDEAS, missing: 'Dolabın içi görünmüyor.' }),
  });
  assert.equal(res.status, 200);
  const sentBytes = calls.lastArgs[0].map((image) => Buffer.from(image.base64, 'base64').toString());
  assert.deepEqual(JSON.parse(JSON.stringify(sentBytes)), ['second-bytes', 'fake-jpeg-bytes']);
  assert.equal(res.body.sourcePhotoId, second.id);
  assert.equal(f.api.roomSuggestions.get(res.body.id, 'owner').missing, 'Dolabın içi görünmüyor.');
});


test('room brief: saving a correction never clears the goal, and the goal form never clears corrections', async t => {
  const f = fixture(t);
  f.api.updateRoomBrief(f.roomId, 'owner', { goal: 'dijital atölye', story: 'eski atölye' });
  f.api.updateRoomBrief(f.roomId, 'owner', { corrections: 'öndeki koyu şey monitör değil, harici diskler' });
  let detail = f.api.getRoomDetail(f.roomId, 'owner');
  assert.equal(detail.goal, 'dijital atölye');
  assert.equal(detail.corrections, 'öndeki koyu şey monitör değil, harici diskler');
  f.api.setRoomGoal(f.roomId, 'owner', { goal: 'stüdyo', story: '' });
  detail = f.api.getRoomDetail(f.roomId, 'owner');
  assert.equal(detail.goal, 'stüdyo');
  assert.equal(detail.story, null);
  assert.equal(detail.corrections, 'öndeki koyu şey monitör değil, harici diskler');
  assert.equal(f.api.updateRoomBrief(f.roomId, 'stranger', { corrections: 'x' }), null);
});

test('route: corrections are read from the room, reach the AI, and are kept with the suggestion', async t => {
  const f = fixture(t);
  f.api.updateRoomBrief(f.roomId, 'owner', { corrections: 'öndeki koyu şey monitör değil, harici diskler' });
  const { res, calls } = await postSuggestion(f, f.roomId, { photoId: f.photoId });
  assert.equal(calls.lastArgs[1].corrections, 'öndeki koyu şey monitör değil, harici diskler');
  assert.equal(f.api.roomSuggestions.get(res.body.id, 'owner').corrections, 'öndeki koyu şey monitör değil, harici diskler');
});

test('suggestRoomIdeas and suggestIdeaPlan: corrections go in the user turn, never the system prompt', async () => {
  const { suggestRoomIdeas, sent } = loadSuggestRoomIdeas(JSON.stringify({ seen: [], summary: 'x', ideas: [] }));
  await suggestRoomIdeas(IMAGE, { name: 'Atölye', corrections: 'mor kutu değil, çekmeceli dolap' });
  assert.match(sent[0].messages[0].content[1].text, /yanlış gördüklerine dair düzeltmeleri: mor kutu değil, çekmeceli dolap/);
  assert.ok(!sent[0].system.includes('mor kutu değil'));

  const code = fs.readFileSync(path.join(__dirname, '../lib/anthropic.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const planSent = [];
  function FakeAnthropic() {
    this.messages = { create: async (request) => { planSent.push(request); return { content: [{ type: 'text', text: JSON.stringify({ steps: ['a'], needs: [], difficulty: 'kolay', time: '5 dakika', budget: 'Bütçe gerekmez' }) }], stop_reason: 'end_turn' }; } };
    this.beta = { messages: this.messages };
  }
  const ctx = { Anthropic: FakeAnthropic, roomItemSources: {}, MAX_ROOM_PHOTOS: 6, SESTIA_VOICE_COMPASS: 'x', chatContext: require('../lib/chatContext.cjs'), process: { env: { ANTHROPIC_API_KEY: 'test', ANTHROPIC_MODEL: 'test' } }, console };
  vm.createContext(ctx);
  vm.runInContext(code + ';globalThis.__plan = suggestIdeaPlan;', ctx);
  await ctx.__plan(IMAGE, 'Atölye', { seen: [], corrections: 'mor kutu değil, çekmeceli dolap', ideas: [{ title: 'a', detail: 'b' }] }, 0);
  assert.match(planSent[0].messages[0].content[1].text, /düzeltmeleri: mor kutu değil, çekmeceli dolap/);
});

test('store migrations survive parallel processes opening the same old database (next build workers)', async t => {
  const { spawn } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-suggestions-race-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'race.db');
  // An old-format table: none of the later columns exist yet.
  const seed = new Database(file);
  seed.exec(`CREATE TABLE room_suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, device_id TEXT NOT NULL,
    source_photo_id INTEGER NOT NULL, summary TEXT NOT NULL, ideas_json TEXT NOT NULL, messages_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  seed.close();
  const script = `const Database = require(${JSON.stringify(require.resolve('better-sqlite3'))});
    const db = new Database(${JSON.stringify(file)}, { timeout: 10000 });
    require(${JSON.stringify(path.join(__dirname, '../lib/roomSuggestionStore.cjs'))}).createRoomSuggestionStore(db);`;
  const runs = await Promise.all(Array.from({ length: 8 }, () => new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stderr }));
  })));
  for (const run of runs) assert.equal(run.code, 0, run.stderr);
  const check = new Database(file);
  const columns = check.prepare('PRAGMA table_info(room_suggestions)').all().map((c) => c.name);
  check.close();
  for (const column of ['seen_json', 'missing', 'goal', 'story', 'corrections']) assert.ok(columns.includes(column), column);
});

test('ensureColumn: a column another process added first is not an error', () => {
  const { ensureColumn } = require('../lib/roomSuggestionStore.cjs');
  const db = new Database(':memory:');
  db.exec('CREATE TABLE t (id INTEGER)');
  // A stale first look (as if checked just before another process added it).
  let stale = true;
  const view = {
    prepare: (sql) => (stale && sql.startsWith('PRAGMA') ? { all: () => { stale = false; db.exec('ALTER TABLE t ADD COLUMN x TEXT'); return [{ name: 'id' }]; } } : db.prepare(sql)),
    exec: (sql) => db.exec(sql),
    transaction: (fn) => db.transaction(fn),
  };
  assert.doesNotThrow(() => ensureColumn(view, 't', 'x', 'TEXT'));
  assert.ok(db.prepare('PRAGMA table_info(t)').all().some((c) => c.name === 'x'));
});
