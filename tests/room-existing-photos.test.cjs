const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const roomScanClient = require('../lib/roomScanClient.cjs');
const roomItemSources = require('../lib/roomItemSources.cjs');
const { randomUUID } = require('node:crypto');

// Existing room photos -> room analysis. Runs the actual Page functions (as in
// room-client.test.cjs) against a fake server that records every request.
const source = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
function client(fetch) {
  const ctx = {
    fetch, roomScanClient, roomItemSources, crypto: { randomUUID }, FormData, File, Blob, AbortController,
    MAX_ROOM_PHOTOS: 6, MAX_UPLOAD_BYTES: 20 * 1024 * 1024,
    activeRoomRef: { current: null }, roomAnalysisSessionKeyRef: { current: 'initial-key' },
    roomReceiptRef: { current: null }, roomInitialSnapshotRef: { current: null }, roomConfirmationRef: { current: null }, roomWriteRef: { current: null },
    roomPhotosRef: { current: [] }, roomRequestRef: { current: null }, roomLeaseRef: { current: null }, roomSessionRef: { current: 0 }, roomFilesRef: { current: [] },
    roomPhotoVersionRef: { current: 0 }, roomCoverageRequestRef: { current: null }, roomUploadsRef: { current: new Map() },
    roomAnalysisPhotosRef: { current: [] }, roomSaveFlowRef: { current: null }, roomCreateOperationRef: { current: null }, roomDetailRequestRef: { current: null },
    roomExistingLoadRef: { current: null },
    rooms: [], view: 'room-detail', roomDraftDirty: false, roomItems: [], roomMessages: [], roomPhotos: [],
    roomExistingPick: null, roomExistingRetry: null,
    loadRooms() {}, refreshHomeState() {}, loadInspiration() {}, resetSingleScan() {}, logEvent() {}, compressImage: async f => f,
    window: { confirm: () => true }, URL: { revokeObjectURL() {}, createObjectURL: () => 'blob:' + randomUUID() },
  };
  for (const name of ['RoomScanSaving', 'RoomScanSaved', 'RoomDraftDirty', 'RoomDraftError', 'RoomError', 'RoomItems', 'RoomConfirming', 'View',
    'RoomRecovery', 'RoomMessages', 'RoomScanNeedsRoom', 'RoomLegacyApprovalUnknown', 'RoomPhotos', 'RoomAnalyzing', 'RoomScanSaveError',
    'RoomScanSavedRoomName', 'RoomCoverageChecking', 'RoomCoverageResult', 'RoomChatDraft', 'RoomChatBusy', 'RoomChatError', 'RoomCreating',
    'RoomDetailError', 'AccountEmailFlow', 'RoomExistingPick', 'RoomExistingRetry']) {
    const key = name[0].toLowerCase() + name.slice(1);
    ctx['set' + name] = value => { ctx[key] = typeof value === 'function' ? value(ctx[key]) : value; };
  }
  vm.createContext(ctx);
  for (const name of ['startRoomScanInRoom', 'reserveRoomScan', 'resetRoomScan', 'releaseEmptyRoomScan', 'roomContext', 'isRoomContext',
    'updateRoomPhotos', 'invalidateRoomCoverage', 'persistNewRoomScanPhotos', 'checkRoomPhotoCoverage', 'startRoomAnalysis',
    'persistRoomScanIfActive', 'recoverRoomWrite', 'goTo', 'addRoomPhotos', 'removeRoomPhoto',
    // Added by the fix; skipped when absent so the old code fails on behavior.
    'loadExistingRoomPhotos', 'toggleExistingRoomPhoto', 'analyzeSelectedExistingRoomPhotos']) {
    const match = new RegExp('  (?:async )?function ' + name + '\\(').exec(source);
    if (!match) continue;
    const end = source.indexOf('\n  }', match.index) + '\n  }'.length;
    vm.runInContext(source.slice(match.index, end), ctx);
  }
  return ctx;
}

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
const photos = (...ids) => ids.map(id => ({ id, mimeType: 'image/jpeg', created_at: `2026-09-2${id % 10}` }));
const detail = (id, list) => ({ id, name: id === 7 ? 'Salon' : 'Mutfak', photos: list, decisions: [], analyses: [], scan: null });

// Fake server: scan reservations, photo bytes per id, coverage and analysis.
function server({ sufficient = true, photoResponse } = {}) {
  const calls = [];
  const analyses = [];
  const fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    calls.push({ url, method, body });
    let m;
    if ((m = /^\/api\/rooms\/(\d+)\/scan\?/.exec(url))) return json({ active: false, generation: 4 });
    if ((m = /^\/api\/rooms\/(\d+)\/scan$/.exec(url))) {
      if (body.action === 'begin') return json({ active: true, generation: 5, sessionKey: body.sessionKey, analysisId: null, orphanToken: null });
      if (method === 'DELETE') return json({ released: true });
      return json({ analysisId: 90, revision: 1, sessionKey: body.sessionKey });
    }
    if ((m = /^\/api\/rooms\/(\d+)\/photos\/(\d+)$/.exec(url))) {
      if (photoResponse) return photoResponse(Number(m[1]), Number(m[2]), options);
      return { ok: true, status: 200, headers: { get: () => 'image/jpeg' }, blob: async () => new Blob([`room${m[1]}-photo${m[2]}`], { type: 'image/jpeg' }) };
    }
    if (url === '/api/analyze') {
      const images = await Promise.all(body.getAll('image').map(f => (typeof f === 'string' ? f : f.text())));
      analyses.push({ mode: body.get('mode'), images });
      return body.get('mode') === 'oda-kapsam'
        ? json(sufficient ? { sufficient: true } : { sufficient: false, reply: 'Bir açı daha', requestedAngle: 'kapı' })
        : json({ items: [{ id: 'i1', label: 'Koltuk', category: 'Mobilya', recommendation: 'tut', reasoning: 'r' }], messages: [{ role: 'assistant', content: 'ok' }] });
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
  return {
    fetch, calls, analyses,
    photoGets: () => calls.filter(c => /\/photos\/\d+$/.test(c.url)).map(c => c.url),
    uploads: () => calls.filter(c => /\/photos$/.test(c.url)),
    snapshots: () => calls.filter(c => /\/scan$/.test(c.url) && c.method === 'POST' && c.body.items),
    begins: () => calls.filter(c => c.body?.action === 'begin'),
    releases: () => calls.filter(c => c.method === 'DELETE'),
  };
}
async function open(c, id, list) {
  c.view = 'room-detail';
  c.roomDetail = detail(id, list);
  await c.startRoomScanInRoom();
  await flush();
}

test('1 existing photo: used automatically, no picker, coverage then analysis', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, photos(11));
  assert.deepEqual(s.photoGets(), ['/api/rooms/7/photos/11']);
  assert.deepEqual(s.analyses.map(a => [a.mode, a.images]), [['oda-kapsam', ['room7-photo11']], ['oda', ['room7-photo11']]]);
  assert.equal(c.view, 'room-review');
  assert.deepEqual(Array.from(c.roomPhotos, p => [p.photoId, p.existing]), [[11, true]]);
});

test('2-6 existing photos: all of them, in room order, are the analysis input', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, photos(11, 12, 13, 14, 15, 16));
  const analysis = s.analyses.find(a => a.mode === 'oda');
  assert.deepEqual(analysis.images, [11, 12, 13, 14, 15, 16].map(id => `room7-photo${id}`));
  assert.deepEqual(Array.from(c.roomAnalysisPhotosRef.current, p => p.photoId), [11, 12, 13, 14, 15, 16]);
  assert.equal(c.roomFilesRef.current.length, 6, 'chat keeps the analyzed files');
});

test('existing photo IDs are kept: no upload, no duplicate room_photos', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, photos(11, 12, 13));
  assert.equal(s.uploads().length, 0);
  assert.deepEqual(s.snapshots().map(x => Array.from(x.body.photoIds)), [[11, 12, 13]]);
});

test('correct room and scan session: reservation, bytes and snapshot all target the same scan', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, photos(11, 12));
  const key = s.begins()[0].body.sessionKey;
  assert.equal(c.roomAnalysisSessionKeyRef.current, key);
  assert.ok(s.photoGets().every(url => url.startsWith('/api/rooms/7/')));
  assert.deepEqual(s.snapshots().map(x => [x.url, x.body.sessionKey]), [['/api/rooms/7/scan', key]]);
  assert.equal(c.roomReceiptRef.current.roomId, 7);
  assert.equal(c.roomInitialSnapshotRef.current, null, 'AUDIT-01 snapshot is cleared by the receipt as before');
});

test('0 photos: the existing picker flow is unchanged', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, []);
  assert.equal(c.view, 'room-scan');
  assert.equal(c.roomPhotos.length, 0);
  assert.equal(s.photoGets().length + s.analyses.length, 0);
  assert.equal(c.roomExistingPick ?? null, null);
});

test('>6 photos: nothing is loaded or analyzed until the user picks at most 6', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, photos(11, 12, 13, 14, 15, 16, 17, 18));
  assert.equal(c.view, 'room-scan');
  assert.equal(s.photoGets().length + s.analyses.length, 0, 'no silent latest-6');
  assert.deepEqual(Array.from(c.roomExistingPick?.photos || [], p => p.id), [11, 12, 13, 14, 15, 16, 17, 18]);
  assert.equal(c.roomExistingPick.selected.length, 0);
  c.analyzeSelectedExistingRoomPhotos(); await flush();
  assert.equal(s.analyses.length, 0, 'an empty choice starts nothing');
  for (const id of [11, 12, 13, 14, 15, 16, 17]) c.toggleExistingRoomPhoto(id);
  assert.equal(c.roomExistingPick.selected.length, 6, 'a 7th pick is refused');
  c.toggleExistingRoomPhoto(12);
  assert.deepEqual(Array.from(c.roomExistingPick.selected).sort(), [11, 13, 14, 15, 16]);
});

test('>6 photos: only the chosen photoIds are fetched, analyzed and linked', async () => {
  const s = server(); const c = client(s.fetch);
  await open(c, 7, photos(11, 12, 13, 14, 15, 16, 17, 18));
  for (const id of [18, 13, 15]) c.toggleExistingRoomPhoto(id);
  c.analyzeSelectedExistingRoomPhotos(); await flush();
  assert.deepEqual(s.photoGets(), [13, 15, 18].map(id => `/api/rooms/7/photos/${id}`));
  assert.deepEqual(s.analyses.find(a => a.mode === 'oda').images, ['room7-photo13', 'room7-photo15', 'room7-photo18']);
  assert.deepEqual(Array.from(s.snapshots()[0].body.photoIds), [13, 15, 18]);
  assert.equal(c.roomExistingPick, null);
  assert.equal(s.uploads().length, 0);
});

test('fetch failure: no analysis on a subset, clear error, nothing deleted, retry works', async () => {
  let fail = true;
  const s = server({ photoResponse: (room, id) => (fail && id === 12
    ? { ok: false, status: 404, headers: { get: () => 'application/json' }, blob: async () => new Blob([]) }
    : { ok: true, status: 200, headers: { get: () => 'image/jpeg' }, blob: async () => new Blob([`room${room}-photo${id}`], { type: 'image/jpeg' }) }) });
  const c = client(s.fetch);
  await open(c, 7, photos(11, 12, 13));
  assert.equal(s.analyses.length, 0, 'never a silent subset');
  assert.equal(c.roomPhotos.length, 0);
  assert.equal(c.view, 'room-scan', 'the picker stays available');
  assert.match(c.roomError || '', /fotoğraf/i);
  assert.equal(s.calls.filter(x => x.method !== 'GET' && /\/photos/.test(x.url)).length, 0, 'room photos untouched');
  assert.equal(s.releases().length, 0);
  assert.ok(c.roomExistingRetry, 'recoverable: retry offered');
  fail = false;
  c.loadExistingRoomPhotos(c.roomExistingRetry); await flush();
  assert.deepEqual(s.analyses.find(a => a.mode === 'oda').images, ['room7-photo11', 'room7-photo12', 'room7-photo13']);
  assert.equal(c.roomError, null);
});

test('stale fetch after back or a new scan never writes into the new state', async () => {
  for (const leave of [
    c => c.goTo('home'),
    async c => { c.view = 'room-detail'; c.roomDetail = detail(8, []); await c.startRoomScanInRoom(); },
  ]) {
    const gate = deferred();
    const s = server({ photoResponse: async (room, id) => { await gate.promise; return { ok: true, status: 200, headers: { get: () => 'image/jpeg' }, blob: async () => new Blob([`room${room}-photo${id}`], { type: 'image/jpeg' }) }; } });
    const c = client(s.fetch);
    await open(c, 7, photos(11, 12));
    assert.equal(s.photoGets().length, 2);
    await leave(c); await flush();
    const after = { view: c.view, photos: c.roomPhotos, error: c.roomError, key: c.roomAnalysisSessionKeyRef.current };
    gate.resolve(); await flush();
    assert.equal(s.analyses.length, 0, 'old photos never reach coverage/analysis');
    assert.deepEqual({ view: c.view, photos: Array.from(c.roomPhotos), error: c.roomError, key: c.roomAnalysisSessionKeyRef.current }, { ...after, photos: Array.from(after.photos) });
  }
});

test('existing photos loaded but no analysis yet: leaving releases the reservation', async () => {
  const s = server({ sufficient: false }); const c = client(s.fetch);
  await open(c, 7, photos(11, 12));
  assert.equal(c.roomPhotos.length, 2);
  assert.ok(c.roomCoverageResult, 'Sestia asked for another angle; no analysis started');
  const key = c.roomLeaseRef.current.sessionKey;
  c.goTo('home'); await flush();
  assert.deepEqual(s.releases().map(x => x.body.sessionKey), [key]);
});

test('existing photos plus a newly added photo is real work: never released', async () => {
  const s = server({ sufficient: false });
  const fetch = async (url, options) => (/\/photos$/.test(url) && options.method === 'POST' ? json({ id: 99 }) : s.fetch(url, options));
  const c = client(fetch);
  await open(c, 7, photos(11));
  await c.addRoomPhotos({ target: { files: [new File(['new'], 'n.jpg', { type: 'image/jpeg' })], value: 'x' } }); await flush();
  c.goTo('home'); await flush();
  assert.equal(s.releases().length, 0);
});
