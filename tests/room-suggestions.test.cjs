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
  vm.runInContext(code + ';globalThis.api={createRoom,creations,roomSuggestions,getRoomDetail,getRoomName,logEvent};', ctx);
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
    { area: 'yerlesim', title: 'Koltuğu pencereye çevir', detail: 'Koltuğu pencerenin önüne al.' },
    { area: 'isik', title: 'Köşeye ayaklı lamba', detail: 'Boş köşeye sıcak ışıklı bir lamba.' },
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
    roomSuggestions: f.api.roomSuggestions, getRoomName: f.api.getRoomName, logEvent: f.api.logEvent,
    MAX_SUGGESTION_IMAGE_BYTES: maxBytes,
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
  const [image, roomName] = calls.lastArgs;
  assert.equal(Buffer.from(image.base64, 'base64').toString(), 'fake-jpeg-bytes', 'bytes come from the stored room photo');
  assert.equal(image.mediaType, 'image/jpeg');
  assert.equal(roomName, 'Salon');
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
    ideas: [{ area: 'renk', title: ' Sıcak tonlar ', detail: ' Yastıklarda hardal. ' }],
  }));
  const result = await suggestRoomIdeas(IMAGE, 'Çalışma <odası>');
  assert.deepEqual(JSON.parse(JSON.stringify(result.seen)), ['masada kağıt yığını']);
  assert.equal(result.summary, 'Aydınlık bir oda.');
  assert.deepEqual(JSON.parse(JSON.stringify(result.ideas)), [{ area: 'renk', title: 'Sıcak tonlar', detail: 'Yastıklarda hardal.' }]);
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
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ area: 'sat', title: 'a', detail: 'b' }] }), // per-item verdict, not an area
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ area: 'diy', title: 'a', detail: 'b' }] }), // DIY is a separate feature now
    JSON.stringify({ seen: [], summary: '', ideas: [] }),
    JSON.stringify({ summary: 'x', ideas: [] }), // what it saw is required
    JSON.stringify({ seen: [''], summary: 'x', ideas: [] }),
    JSON.stringify({ seen: [], summary: 'x', ideas: Array.from({ length: 6 }, () => ({ area: 'renk', title: 'a', detail: 'b' })) }),
    JSON.stringify({ seen: [], summary: 'x', ideas: [{ area: 'renk', title: 'a' }] }),
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
