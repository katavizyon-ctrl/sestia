const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const roomScanClient = require('../lib/roomScanClient.cjs');
const roomItemSources = require('../lib/roomItemSources.cjs');
const { randomUUID } = require('node:crypto');

// Execute the actual Page functions with controlled state setters and transport.
// This is not a browser lifecycle test; React rendering is covered separately.
function client(fetch) {
  const source = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');
  const names = ['retryRoomScanSave', 'persistRoomScanIfActive', 'persistRoomDraft', 'confirmRoomDecisions', 'recoverRoomWrite',
    'loadRecoveredRoomScan', 'setRoomItemRec', 'toggleRoomExclude', 'resumeRoomScan', 'reserveRoomScan', 'roomContext', 'isRoomContext', 'updateRoomPhotos', 'invalidateRoomCoverage',
    'resetRoomScan', 'addRoomPhotos', 'removeRoomPhoto', 'persistNewRoomScanPhotos', 'retryFailedRoomPhotos',
    'checkRoomPhotoCoverage', 'startRoomAnalysis', 'sendRoomChat', 'saveRoomScanToRoom', 'openRoom', 'goTo', 'handleBrowserBack', 'startRoomScanInRoom', 'createRoomAndOpen', 'handleRoomPhotoUpload', 'releaseEmptyRoomScan'];
  const ctx = {
    fetch, roomScanClient, roomItemSources, crypto: { randomUUID }, FormData, AbortController, MAX_ROOM_PHOTOS: 6, MAX_UPLOAD_BYTES: 20 * 1024 * 1024, SCAN_PERSIST_ERROR: 'save failed',
    activeRoomRef: { current: { id: 7 } }, roomAnalysisSessionKeyRef: { current: 'session-key' },
    roomReceiptRef: { current: null }, roomInitialSnapshotRef: { current: null }, roomConfirmationRef: { current: null }, roomWriteRef: { current: null }, roomPhotosRef: { current: [] },
    roomRequestRef: { current: null }, roomLeaseRef: { current: null }, roomSessionRef: { current: 0 }, roomFilesRef: { current: [] },
    roomPhotoVersionRef: { current: 0 }, roomCoverageRequestRef: { current: null }, roomUploadsRef: { current: new Map() },
    roomAnalysisPhotosRef: { current: [] }, roomSaveFlowRef: { current: null }, roomExistingLoadRef: { current: null }, roomCreateOperationRef: { current: null }, roomDetailRequestRef: { current: null }, createRoomOperationRef: { current: null }, galleryUploadRef: { current: null },
    rooms: [], roomChatDraft: '', roomChatBusy: false, view: 'room-review', loadRooms() {}, refreshHomeState() {}, loadInspiration() {}, resetSingleScan() {}, compressImage: async f => f,
    roomItems: [{ id: 'item-1', recommendation: 'sat', excluded: false }], roomMessages: [], roomPhotos: [],
    roomDraftDirty: false, roomLegacyApprovalUnknown: false, roomConfirming: false, roomScanSaved: false,
    roomRecovery: null, window: { confirm: () => true }, URL: { revokeObjectURL() {}, createObjectURL: () => 'blob:' + randomUUID() }, logEvent() {},
    openRoom(id) { ctx.openedRoom = id; },
  };
  for (const name of ['RoomScanSaving','RoomScanSaved','RoomDraftDirty','RoomDraftError','RoomError','RoomItems',
    'RoomConfirming','HomeState','Celebration','View','RoomRecovery','RoomMessages','RoomScanNeedsRoom',
    'RoomLegacyApprovalUnknown','RoomPhotos','RoomAnalyzing','RoomScanSaveError','RoomScanSavedRoomName',
    'RoomCoverageChecking','RoomCoverageResult','RoomChatDraft','RoomChatBusy','RoomChatError','Rooms','RoomDetail','RoomDetailLoading','RoomDetailError','RoomPhotoUploading','RoomCreating','RoomsError','RoomExistingPick','RoomExistingRetry']) {
    const key = name[0].toLowerCase() + name.slice(1);
    ctx['set' + name] = value => { ctx[key] = typeof value === 'function' ? value(ctx[key]) : value; };
  }
  vm.createContext(ctx);
  for (const name of names) {
    const match = new RegExp('  (?:async )?function ' + name + '\\(').exec(source);
    assert.ok(match, name);
    const start = match.index;
    const end = source.indexOf('\n  }', start) + '\n  }'.length;
    vm.runInContext(source.slice(start, end), ctx);
  }
  return ctx;
}
const response = body => ({ ok: true, status: 200, json: async () => body });
const receipt = { analysisId: 9, revision: 1, sessionKey: 'session-key' };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
const photo = text => new File([text], text + '.jpg', { type: 'image/jpeg' });
const event = (...files) => ({ target: { files, value: 'chosen' } });

test('AUDIT-02: explicit choices survive PATCH payload, hydration, resume and subsequent AI for all enums', async () => {
  for (const value of ['tut', 'sat', 'bagisla', 'geri_donustur', 'at']) {
    let payload;
    const c = client(async (url, options) => {
      payload = JSON.parse(options.body);
      return response({ ...receipt, revision: 2, items: payload.choices });
    });
    c.roomReceiptRef.current = { ...receipt, roomId: 7 };
    c.roomItems = [{ id: 'item-1', recommendation: value, manual: false, excluded: false }];
    c.setRoomItemRec(0, value);
    c.setRoomItemRec(0, value === 'tut' ? 'sat' : 'tut');
    c.setRoomItemRec(0, value); // A -> B -> A before any write still expresses intent.
    c.toggleRoomExclude(0); c.toggleRoomExclude(0);
    await c.persistRoomDraft();
    assert.equal(payload.choices[0].manual, true);
    assert.equal(c.roomItems[0].manual, true);
    c.roomDetail = { id: 7, photos: [], scanStatus: {}, scan: { ...receipt, revision: 2, items: c.roomItems, messages: [] } };
    c.resumeRoomScan();
    const next = roomItemSources.reconcileRoomItems([{ id: 'item-1', recommendation: value === 'tut' ? 'sat' : 'tut' }], c.roomItems, true);
    assert.equal(next[0].recommendation, value);
    assert.equal(next[0].manual, true);
    assert.equal(next[0].excluded, false);
  }
});

for (const committed of [false, true]) for (const dirty of [false, true]) {
  test(`AUDIT-01: initial ${committed ? 'lost response' : '500 before commit'}, dirty=${dirty}, safely retries exact snapshot`, async () => {
    const writes = []; let stored = null, revision = 0;
    const c = client(async (url, options) => {
      if (!options.method) return response({ active: true, sessionKey: receipt.sessionKey,
        analysis: stored ? { ...receipt, items: stored, messages: [], photoIds: [] } : null });
      const body = JSON.parse(options.body); writes.push({ method: options.method, body });
      if (writes.length === 1) {
        if (committed) { stored = body.items; revision = 1; throw new Error('lost response'); }
        return { ok: false, status: 500, json: async () => ({ error: 'scan_failed' }) };
      }
      if (options.method === 'POST') {
        assert.deepEqual(body, writes[0].body, 'retry must not silently replace a committed original snapshot');
        stored = body.items; revision = 1;
        return response(receipt);
      }
      assert.equal(body.revision, revision);
      stored = body.choices; revision++;
      return response({ ...receipt, revision, items: stored });
    });
    c.roomItems[0].manual = false;
    assert.equal(await c.persistRoomScanIfActive(c.roomItems, []), false);
    assert.equal(!!c.roomRecovery.analysis, committed);
    if (dirty) c.setRoomItemRec(0, 'tut');
    assert.equal(await c.retryRoomScanSave(), true);
    assert.equal(c.roomScanSaved, true); assert.equal(c.roomDraftDirty, false);
    assert.equal(c.roomItems[0].recommendation, dirty ? 'tut' : 'sat');
    assert.equal(stored[0].recommendation, c.roomItems[0].recommendation);
    assert.equal(c.roomError, null);
    assert.deepEqual(writes.map(w => w.method), dirty ? ['POST', 'POST', 'PATCH'] : ['POST', 'POST']);
    assert.equal(c.roomReceiptRef.current.revision, dirty ? 2 : 1);
  });
}

test('AUDIT-01: draft button without receipt recovers initial snapshot; repeated click cannot overlap', async () => {
  const retry = deferred(); let posts = 0, patches = 0;
  const c = client(async (url, options) => {
    if (!options.method) return response({ active: true, sessionKey: receipt.sessionKey, analysis: null });
    if (options.method === 'POST') {
      if (++posts === 1) throw new Error('offline');
      return retry.promise;
    }
    patches++; return response({ ...receipt, revision: 2, items: JSON.parse(options.body).choices });
  });
  await c.persistRoomScanIfActive(c.roomItems, []); c.setRoomItemRec(0, 'tut');
  const saving = c.persistRoomDraft();
  await c.persistRoomDraft(); await c.retryRoomScanSave();
  assert.equal(posts, 2); assert.equal(patches, 0);
  retry.resolve(response(receipt)); assert.equal(await saving, true);
  assert.equal(patches, 1); assert.equal(c.roomItems[0].recommendation, 'tut');
});

test('AUDIT-01: newer server revision on retry remains explicit recovery and never erases local choices', async () => {
  const bodies = [];
  const c = client(async (url, options) => {
    if (!options.method) return response({ active: true, sessionKey: receipt.sessionKey,
      analysis: { ...receipt, revision: 3, items: [{ id: 'item-1', recommendation: 'at' }], messages: [], photoIds: [] } });
    bodies.push(JSON.parse(options.body));
    return { ok: false, status: bodies.length === 1 ? 500 : 409, json: async () => ({ error: 'revision_conflict' }) };
  });
  await c.persistRoomScanIfActive(c.roomItems, []); c.setRoomItemRec(0, 'tut');
  assert.equal(await c.retryRoomScanSave(), false);
  assert.equal(await c.retryRoomScanSave(), false);
  assert.equal(bodies.length, 3); assert.deepEqual(bodies[1], bodies[0]);
  assert.equal(c.roomItems[0].recommendation, 'tut'); assert.equal(c.roomDraftDirty, true);
  assert.equal(c.roomScanSaved, false); assert.equal(c.roomReceiptRef.current, null);
  assert.equal(c.roomRecovery.analysis.revision, 3);
});

test('AUDIT-01: empty or closed recovery cannot silently discard local choices', () => {
  for (const analysis of [null, { closed: true }]) {
    const c = client(() => { throw new Error('unexpected network'); });
    c.roomRecovery = { roomId: 7, analysis };
    c.roomDraftDirty = true; c.roomScanSaved = false;
    let opened = 0, prompts = 0;
    c.openRoom = () => { opened++; };
    c.window.confirm = () => { prompts++; return false; };
    c.loadRecoveredRoomScan();
    assert.equal(prompts, 1); assert.equal(opened, 0);
    assert.equal(c.roomItems[0].recommendation, 'sat');
  }
});

test('AUDIT-01: chat after failed initial save recovers original snapshot and choices before calling AI', async () => {
  const calls = []; let first = true;
  const c = client(async (url, options) => {
    if (!options.method) return response({ active: true, sessionKey: receipt.sessionKey, analysis: null });
    if (url === '/api/analyze') {
      calls.push('AI'); return response({ items: c.roomItems, messages: c.roomMessages });
    }
    calls.push(options.method);
    if (first) { first = false; throw new Error('before commit'); }
    const body = JSON.parse(options.body);
    return response({ ...receipt, revision: calls.length, ...(options.method === 'PATCH' ? { items: body.choices } : {}) });
  });
  c.roomMessages = [{ role: 'user', content: 'fixture' }, { role: 'assistant', content: '{}' }];
  await c.persistRoomScanIfActive(c.roomItems, c.roomMessages);
  c.setRoomItemRec(0, 'tut'); c.roomChatDraft = 'fixture followup';
  await c.sendRoomChat({ preventDefault() {} });
  assert.deepEqual(calls, ['POST', 'POST', 'PATCH', 'AI', 'POST']);
  assert.equal(c.roomItems[0].recommendation, 'tut'); assert.equal(c.roomItems[0].manual, true);
});

for (const fails of [false, true]) {
  test(`AUDIT-03: browser back isolates late PUT ${fails ? 'failure' : 'success'} from a new scan and its own PUT`, async () => {
    const old = deferred(), fresh = deferred(); let puts = 0, reads = 0;
    const c = client((url, options) => {
      if (!options.method) { reads++; return response({}); }
      puts++;
      return puts === 1 ? old.promise : fresh.promise;
    });
    c.roomReceiptRef.current = { ...receipt, roomId: 7 }; c.roomScanSaved = true;
    const previous = c.confirmRoomDecisions();
    c.handleBrowserBack();
    assert.equal(c.view, 'home'); assert.equal(c.roomConfirming, false);
    c.roomReceiptRef.current = { ...receipt, analysisId: 10, roomId: 7, sessionKey: c.roomAnalysisSessionKeyRef.current };
    c.view = 'room-review'; c.roomScanSaved = true;
    const next = c.confirmRoomDecisions();
    assert.equal(c.roomConfirming, true);
    if (fails) old.reject(new Error('old network error'));
    else old.resolve(response({ state: { streak: 90 }, count: 9, replayed: false }));
    await previous;
    assert.equal(c.roomConfirming, true); assert.equal(c.view, 'room-review'); assert.equal(reads, 0);
    fresh.resolve(response({ state: { streak: 1 }, count: 1, replayed: true })); await next;
    assert.equal(c.roomConfirming, false); assert.equal(c.view, 'celebration');
    assert.equal(c.celebration.pointsGained, 0);
  });
}

test('AUDIT-03: same-render double confirmation is locked synchronously, not only by React state', async () => {
  const pending = deferred(); let puts = 0;
  const c = client(() => { puts++; return pending.promise; });
  c.roomReceiptRef.current = { ...receipt, roomId: 7 }; c.roomScanSaved = true;
  c.setRoomConfirming = () => {}; // React state value in this render stays false until rerender.
  const first = c.confirmRoomDecisions(), second = c.confirmRoomDecisions();
  assert.equal(puts, 1);
  pending.resolve(response({ state: { streak: 1 }, count: 1, replayed: false }));
  await Promise.all([first, second]);
});

test('B01: A upload completes during B compression without losing either entry or photoId', async () => {
  const upload = deferred(), compression = deferred();
  const c = client(() => upload.promise);
  c.checkRoomPhotoCoverage = () => {};
  const a = photo('A'), b = photo('B');
  c.compressImage = file => file === b ? compression.promise : Promise.resolve(file);
  await c.addRoomPhotos(event(a));
  const addingB = c.addRoomPhotos(event(b));
  assert.equal(c.roomPhotosRef.current.length, 2);
  upload.resolve(response({ id: 101 })); await flush();
  assert.equal(c.roomPhotosRef.current[0].photoId, 101);
  compression.resolve(b); await addingB; await flush();
  assert.equal(c.roomPhotosRef.current[0].photoId, 101);
  assert.equal(c.roomPhotosRef.current[1].file, b);
  assert.equal(c.roomPhotos, c.roomPhotosRef.current);
  assert.equal(c.roomPhotosRef.current[0].uploading, false);
});

test('B01: pending compression reserves capacity; removal cannot resurrect a photo', async () => {
  const pending = deferred();
  const c = client(async () => response({ id: 1 }));
  c.activeRoomRef.current = null; c.checkRoomPhotoCoverage = () => {};
  c.compressImage = () => pending.promise;
  const first = c.addRoomPhotos(event(photo('A'), photo('B'), photo('C'), photo('D')));
  const second = c.addRoomPhotos(event(photo('E'), photo('F'), photo('G'), photo('H')));
  assert.equal(c.roomPhotosRef.current.length, 6);
  const removed = c.roomPhotosRef.current[0].id;
  c.removeRoomPhoto(removed);
  pending.resolve(photo('compressed')); await Promise.all([first, second]);
  assert.equal(c.roomPhotosRef.current.length, 5);
  assert.ok(!c.roomPhotosRef.current.some(p => p.id === removed));
  assert.equal(c.roomPhotos, c.roomPhotosRef.current);
});

test('B01/N02: removed upload and old-session compression cannot write new state', async () => {
  const upload = deferred(), compression = deferred();
  const c = client(() => upload.promise); c.checkRoomPhotoCoverage = () => {};
  await c.addRoomPhotos(event(photo('A')));
  c.removeRoomPhoto(c.roomPhotosRef.current[0].id);
  upload.resolve(response({ id: 50 })); await flush();
  assert.equal(c.roomPhotosRef.current.length, 0);
  c.compressImage = () => compression.promise;
  const old = c.addRoomPhotos(event(photo('B')));
  c.resetRoomScan(); c.setRoomError('new screen');
  compression.resolve(photo('B')); await old;
  assert.equal(c.roomPhotosRef.current.length, 0); assert.equal(c.roomError, 'new screen');
});

test('N01: coverage response for changed photo version or old session never starts analysis', async () => {
  for (const reset of [false, true]) {
    const pending = deferred(); let analyses = 0;
    const c = client(() => pending.promise);
    const a = { id: 'A', file: photo('A'), url: 'blob:A' };
    c.updateRoomPhotos(() => [a]); c.startRoomAnalysis = () => { analyses++; };
    const checking = c.checkRoomPhotoCoverage([a]);
    if (reset) c.resetRoomScan(); else c.removeRoomPhoto('A');
    c.setRoomCoverageChecking(true); // A newer operation owns this flag.
    pending.resolve(response({ sufficient: true })); await checking;
    assert.equal(analyses, 0); assert.equal(c.roomCoverageChecking, true);
  }
});

test('N01: analyzed bytes and saved photoIds refer to the same ordered snapshot', async () => {
  const a = { id: 'photo-A-key', file: photo('A') }, b = { id: 'photo-B-key', file: photo('B') };
  let bytes, saved;
  const c = client(async (url, options) => {
    if (url.endsWith('/photos')) return response({ id: options.body.get('operationKey') === a.id ? 31 : 12 });
    if (url === '/api/analyze') {
      bytes = await Promise.all(options.body.getAll('image').map(file => file.text()));
      return response({ items: [], messages: [] });
    }
    saved = JSON.parse(options.body); return response(receipt);
  });
  c.updateRoomPhotos(() => [a, b]);
  await c.startRoomAnalysis();
  assert.deepEqual(bytes, ['A', 'B']); assert.deepEqual(saved.photoIds, [31, 12]);
  assert.equal(c.roomFilesRef.current[0], a.file);
  assert.equal(c.roomScanSaved, true);
});

test('N01: photo removal while waiting for upload cancels the analysis chain', async () => {
  const pending = deferred(); let analyzed = 0;
  const c = client((url) => { if (url === '/api/analyze') analyzed++; return pending.promise; });
  c.updateRoomPhotos(() => [{ id: 'photo-A-key', file: photo('A') }]);
  const task = c.startRoomAnalysis();
  c.removeRoomPhoto('photo-A-key');
  pending.resolve(response({ id: 3 })); await task;
  assert.equal(analyzed, 0); assert.equal(c.roomAnalyzing, false);
});

test('N02: late room creation response cannot change room, flags or photos of B', async () => {
  const pending = deferred(); const c = client(() => pending.promise);
  c.activeRoomRef.current = null;
  const task = c.saveRoomScanToRoom({ name: 'A' });
  c.resetRoomScan(); c.activeRoomRef.current = { id: 88, name: 'B' };
  c.setRoomScanSaving(true); c.setRoomScanSaved(true);
  pending.resolve(response({ id: 77, name: 'A' })); await task;
  assert.equal(c.activeRoomRef.current.id, 88);
  assert.equal(c.roomScanSaving, true); assert.equal(c.roomScanSaved, true);
  assert.equal(c.rooms.length, 0);
});

test('N02: late upload result and error cannot change B or clear its saving flag', async () => {
  for (const reject of [false, true]) {
    const pending = deferred(); const c = client(() => pending.promise);
    const a = { id: 'photo-A-key', file: photo('A') }; c.updateRoomPhotos(() => [a]);
    const task = c.persistNewRoomScanPhotos([a]);
    c.resetRoomScan(); c.activeRoomRef.current = { id: 88 };
    const b = { id: 'photo-B-key', file: photo('B') }; c.updateRoomPhotos(() => [b]); c.setRoomError('B');
    if (reject) pending.reject(new Error('lost')); else pending.resolve(response({ id: 44 }));
    await task;
    assert.equal(c.roomPhotosRef.current[0], b); assert.equal(c.roomError, 'B');
  }
});

test('N02: draft awaited by chat cannot launch old model request after switching session', async () => {
  const pending = deferred(); const methods = [];
  const c = client(async (url, options) => { methods.push(options.method); return pending.promise; });
  c.roomReceiptRef.current = { ...receipt, roomId: 7 }; c.roomDraftDirty = true;
  c.roomChatDraft = 'Merhaba'; c.roomMessages = [{ role: 'user', content: 'old' }];
  const task = c.sendRoomChat({ preventDefault() {} });
  c.resetRoomScan(); c.setRoomScanSaving(true);
  pending.resolve(response({ ...receipt, revision: 2, items: [] })); await task;
  assert.deepEqual(methods, ['PATCH']); assert.equal(c.roomScanSaving, true);
});

test('N02: chat holds its lock through snapshot persistence; stale chat cannot overwrite B', async () => {
  const pending = deferred(); let writes = 0;
  const c = client(async (url, options) => {
    if (url === '/api/analyze') return response({ items: c.roomItems, messages: [{ role: 'assistant', content: 'new' }] });
    writes++; return pending.promise;
  });
  c.roomScanSaved = true; c.roomChatDraft = 'Merhaba'; c.roomMessages = [{ role: 'user', content: 'old' }];
  c.roomReceiptRef.current = { ...receipt, roomId: 7 };
  const task = c.sendRoomChat({ preventDefault() {} }); await flush();
  assert.ok(c.roomRequestRef.current); assert.equal(writes, 1);
  await c.saveRoomScanToRoom({ name: 'wrong' }); assert.equal(writes, 1);
  c.resetRoomScan(); c.setRoomMessages(['B']); c.setRoomScanSaved(false);
  pending.resolve(response({ ...receipt, revision: 2 })); await task;
  assert.deepEqual(c.roomMessages, ['B']); assert.equal(c.roomScanSaved, false);
});

test('N04: lost create response and failed photo step retry identical operation keys', async () => {
  let roomCalls = 0, photoCalls = 0; const roomKeys = [], photoKeys = [];
  const c = client(async (url, options) => {
    if (url === '/api/rooms') {
      roomKeys.push(JSON.parse(options.body).operationKey);
      if (++roomCalls === 1) throw new Error('response lost after commit');
      return response({ id: 90, name: 'Ofis' });
    }
    if (url.endsWith('/photos')) {
      photoKeys.push(options.body.get('operationKey'));
      if (++photoCalls === 1) throw new Error('photo response lost after commit');
      return response({ id: 45 });
    }
    return response(receipt);
  });
  c.activeRoomRef.current = null; c.reserveRoomScan = async () => true;
  const a = { id: 'photo-A-key', file: photo('A') };
  c.updateRoomPhotos(() => [a]); c.roomAnalysisPhotosRef.current = [a];
  await c.saveRoomScanToRoom({ name: 'Ofis' });
  await c.saveRoomScanToRoom({ name: 'Ofis' });
  await c.saveRoomScanToRoom({ name: 'Ofis' });
  assert.equal(roomCalls, 2); assert.equal(roomKeys[0], roomKeys[1]);
  assert.equal(photoKeys[0], photoKeys[1]); assert.equal(c.roomScanSaved, true);
  assert.equal(c.roomScanNeedsRoom, false);
});

test('N02: leaving room-detail invalidates a pending begin before it can open old scan', async () => {
  const pending = deferred();
  const c = client(() => pending.promise);
  c.view = 'room-detail'; c.roomDetail = { id: 7, name: 'A' };
  const task = c.startRoomScanInRoom();
  c.goTo('home');
  pending.resolve(response({ active: false, generation: 0 })); await task;
  assert.equal(c.view, 'home'); assert.equal(c.activeRoomRef.current, null);
});

test('N02: late room detail A cannot replace B after opening B', async () => {
  const a = deferred(), b = deferred();
  const c = client(url => url.endsWith('/1') ? a.promise : b.promise);
  c.view = 'rooms';
  const first = c.openRoom(1), second = c.openRoom(2);
  b.resolve(response({ id: 2, name: 'B' })); await second;
  a.resolve(response({ id: 1, name: 'A' })); await first;
  assert.equal(c.roomDetail.id, 2); assert.equal(c.roomDetailLoading, false);
});

test('N02: old model reply cannot publish chat or trigger persistence after reset', async () => {
  const pending = deferred(); let requests = 0;
  const c = client(() => { requests++; return pending.promise; });
  c.roomScanSaved = true; c.roomChatDraft = 'A'; c.roomMessages = [{ role: 'user', content: 'A' }];
  const task = c.sendRoomChat({ preventDefault() {} });
  c.resetRoomScan(); c.setRoomMessages(['B']); c.setRoomChatBusy(true);
  pending.resolve(response({ items: [], messages: ['old A'] })); await task;
  assert.deepEqual(c.roomMessages, ['B']); assert.equal(c.roomChatBusy, true); assert.equal(requests, 1);
});

test('N02: failed draft from prior visit to same saved session cannot unlock the new visit', async () => {
  const pending = deferred(); const c = client(() => pending.promise);
  c.roomReceiptRef.current = { ...receipt, roomId: 7 };
  const task = c.persistRoomDraft();
  c.resetRoomScan(); c.roomAnalysisSessionKeyRef.current = receipt.sessionKey;
  c.roomWriteRef.current = receipt.sessionKey; c.setRoomScanSaving(true);
  pending.reject(new Error('old failed')); await task;
  assert.equal(c.roomWriteRef.current, receipt.sessionKey); assert.equal(c.roomScanSaving, true);
});

test('N01: resume shows only linked analysis photos, not every gallery photo', () => {
  const c = client(() => { throw new Error('no network'); });
  c.roomDetail = { id: 7, photos: [{ id: 1 }, { id: 2 }], scanStatus: {}, scan: { ...receipt, photoIds: [2], items: [], messages: [] } };
  c.resumeRoomScan();
  assert.equal(c.roomPhotosRef.current.length, 1); assert.equal(c.roomPhotosRef.current[0].photoId, 2);
  assert.equal(c.roomFilesRef.current.length, 0);
});

test('actual client save, draft and confirm are ordered; pending writes block confirmation', async () => {
  const requests = [];
  let resolveSave, resolveDraft;
  const c = client(async (url, options) => {
    requests.push({ method: options.method, body: JSON.parse(options.body) });
    if (options.method === 'POST') return new Promise(resolve => { resolveSave = resolve; });
    if (options.method === 'PATCH') return new Promise(resolve => { resolveDraft = resolve; });
    return response({ state: { streak: 1 }, count: 1, replayed: false });
  });
  const saving = c.persistRoomScanIfActive(c.roomItems, []);
  await c.confirmRoomDecisions();
  assert.equal(requests.length, 1);
  resolveSave(response(receipt)); await saving;
  c.setRoomItemRec(0, 'tut');
  await c.confirmRoomDecisions();
  assert.equal(requests.length, 1);
  const drafting = c.persistRoomDraft();
  await c.confirmRoomDecisions(); assert.equal(requests.length, 2);
  resolveDraft(response({ ...receipt, revision: 2, items: c.roomItems })); await drafting;
  await c.confirmRoomDecisions();
  assert.deepEqual(requests.map(r => r.method), ['POST', 'PATCH', 'PUT']);
  assert.equal(requests[2].body.revision, 2); assert.equal(requests[0].body.protocol, 2);
  assert.equal(c.view, 'celebration');
});

test('lost save response rereads receipt; user explicitly restores saved data before confirming', async () => {
  const c = client(async (url, options) => {
    if (options.method) throw new Error('connection dropped after commit');
    return response({ sessionKey: receipt.sessionKey, active: true, analysis: { ...receipt, items: [{ id: 'item-1', recommendation: 'sat' }], messages: [] } });
  });
  assert.equal(await c.persistRoomScanIfActive(c.roomItems, []), false);
  assert.equal(c.roomRecovery.analysis.analysisId, 9);
  assert.equal(c.roomScanSaved, false);
  c.loadRecoveredRoomScan();
  assert.equal(c.roomReceiptRef.current.revision, 1);
  assert.equal(c.roomScanSaved, true);
});

test('409 draft conflict keeps local edits until user chooses server version', async () => {
  const c = client(async (url, options) => options.method
    ? { ok: false, status: 409, json: async () => ({ error: 'revision_conflict' }) }
    : response({ sessionKey: receipt.sessionKey, active: true, analysis: { ...receipt, revision: 3, items: [{ id: 'item-1', recommendation: 'sat' }], messages: [] } }));
  c.roomReceiptRef.current = { ...receipt, roomId: 7 };
  c.setRoomItemRec(0, 'tut');
  assert.equal(await c.persistRoomDraft(), false);
  assert.equal(c.roomItems[0].recommendation, 'tut'); assert.equal(c.roomDraftDirty, true);
  c.loadRecoveredRoomScan();
  assert.equal(c.roomItems[0].recommendation, 'sat'); assert.equal(c.roomDraftDirty, false);
  assert.equal(c.roomReceiptRef.current.revision, 3);
});

test('late save response cannot attach receipt to a different client session', async () => {
  let finish;
  const c = client(() => new Promise(resolve => { finish = resolve; }));
  const pending = c.persistRoomScanIfActive(c.roomItems, []);
  c.roomAnalysisSessionKeyRef.current = 'new-session';
  finish(response(receipt));
  assert.equal(await pending, false); assert.equal(c.roomReceiptRef.current, null);
});

test('resume actual client restores saved choices and source metadata', () => {
  const c = client(() => { throw new Error('unexpected network'); });
  c.roomDetail = { id: 7, photos: [], scanStatus: { generation: 1 }, scan: {
    ...receipt, items: [{ id: 'item-1', recommendation: 'tut', modelSuggestion: { recommendation: 'sat' } }], messages: [],
  } };
  c.resumeRoomScan();
  assert.equal(c.roomItems[0].recommendation, 'tut');
  assert.equal(c.roomItems[0].modelSuggestion.recommendation, 'sat');
  assert.equal(c.roomScanSaved, true); assert.equal(c.roomReceiptRef.current.analysisId, 9);
});

test('delayed begin read from previous client session cannot reserve or replace a scan', async () => {
  let resolve;
  let writes = 0;
  const c = client((url, options) => {
    if (options.method) writes++;
    return new Promise(done => { resolve = done; });
  });
  const pending = c.reserveRoomScan(7, 'session-key');
  c.roomAnalysisSessionKeyRef.current = 'new-session';
  resolve(response({ active: true, generation: 2, sessionKey: 'new-session' }));
  assert.equal(await pending, false); assert.equal(writes, 0);
});

test('lost confirmation response is reread and retry sends same analysis only', async () => {
  let puts = 0;
  const c = client(async (url, options) => {
    if (options.method === 'PUT') {
      assert.equal(JSON.parse(options.body).analysisId, 9);
      if (++puts === 1) throw new Error('lost response');
      return response({ state: { streak: 1 }, count: 1, replayed: true });
    }
    return response({ active: false, sessionKey: null, analysis: { ...receipt, confirmed: true, closed: true } });
  });
  c.roomReceiptRef.current = { ...receipt, roomId: 7 }; c.roomScanSaved = true;
  await c.confirmRoomDecisions();
  assert.equal(c.roomRecovery.analysis.confirmed, true);
  await c.confirmRoomDecisions();
  assert.equal(puts, 2); assert.equal(c.celebration.pointsGained, 0);
});

test('N04: room created while user left the list is final; next room gets a new key, no false retry block', async () => {
  const pending = deferred(); const bodies = []; const opened = [];
  const c = client(async (url, options) => { bodies.push(JSON.parse(options.body)); return bodies.length === 1 ? pending.promise : response({ id: 71, name: 'Mutfak' }); });
  c.openRoom = async id => { opened.push(id); };
  c.view = 'rooms';
  const first = c.createRoomAndOpen('Salon');
  c.goTo('home'); // Leaves the list; the server write still commits.
  pending.resolve(response({ id: 70, name: 'Salon' })); await first;
  assert.deepEqual(opened, []); assert.equal(c.createRoomOperationRef.current, null);
  assert.ok(c.rooms.some(r => r.id === 70));
  c.view = 'rooms'; c.roomsError = null;
  await c.createRoomAndOpen('Mutfak');
  assert.equal(c.roomsError, null); assert.deepEqual(opened, [71]);
  assert.notEqual(bodies[0].operationKey, bodies[1].operationKey);
});

test('N04: unknown room outcome keeps key and name; definitive 4xx releases it', async () => {
  const bodies = []; let mode = 'lost';
  const c = client(async (url, options) => {
    bodies.push(JSON.parse(options.body));
    if (mode === 'lost') throw new Error('response lost');
    return { ok: false, status: 400, json: async () => ({ error: 'name_required' }) };
  });
  c.openRoom = async () => {};
  await c.createRoomAndOpen('Salon');
  await c.createRoomAndOpen('Başka'); // Blocked: the first outcome is unknown.
  assert.equal(bodies.length, 1); assert.match(c.roomsError, /aynı oda adıyla/i);
  mode = 'rejected';
  await c.createRoomAndOpen('Salon');
  assert.equal(bodies[1].operationKey, bodies[0].operationKey);
  assert.equal(c.createRoomOperationRef.current, null); assert.doesNotMatch(c.roomsError, /Aynı adla/);
  await c.createRoomAndOpen('Başka');
  assert.equal(bodies.length, 3); assert.notEqual(bodies[2].operationKey, bodies[0].operationKey);
});

test('N04: gallery upload that succeeded after navigation is not offered for retry', async () => {
  const pending = deferred(); const keys = [];
  const c = client((url, options) => { keys.push(options.body.get('operationKey')); return pending.promise; });
  c.openRoom = async () => {};
  c.roomDetail = { id: 7, name: 'Salon' }; c.view = 'room-detail';
  const upload = c.handleRoomPhotoUpload(event(photo('A')));
  await flush();
  c.goTo('rooms');
  pending.resolve(response({ id: 5 })); await upload;
  assert.equal(c.galleryUploadRef.current, null);
  assert.equal(keys.length, 1);
});

test('N04: failed gallery upload retries the same operation key and bytes', async () => {
  const keys = [], bytes = []; let calls = 0;
  const c = client(async (url, options) => {
    keys.push(options.body.get('operationKey')); bytes.push(await options.body.get('photo').text());
    if (++calls === 1) throw new Error('response lost');
    return response({ id: 5 });
  });
  let reopened = 0; c.openRoom = async () => { reopened++; };
  c.roomDetail = { id: 7, name: 'Salon' }; c.view = 'room-detail';
  await c.handleRoomPhotoUpload(event(photo('A')));
  assert.ok(c.roomDetailError);
  await c.handleRoomPhotoUpload();
  assert.equal(keys[0], keys[1]); assert.equal(bytes[0], bytes[1]);
  assert.equal(c.galleryUploadRef.current, null); assert.equal(reopened, 1);
});

// Records scan-route calls; answers begin/read with an empty, unreserved room.
function scanRecorder(beginPromise) {
  const calls = [];
  const fetch = async (url, options = {}) => {
    const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : null;
    calls.push({ url, method: options.method || 'GET', body });
    if (!options.method) return response({ active: false, generation: 4 });
    if (body?.action === 'begin') return beginPromise ? beginPromise : response({ active: true, generation: 5, sessionKey: body.sessionKey, analysisId: null, orphanToken: null });
    return response({ released: true });
  };
  return { calls, fetch, releases: () => calls.filter(c => c.method === 'DELETE') };
}

test('E2E §4.2: leaving an empty in-room scan releases exactly its own reservation', async () => {
  const r = scanRecorder(); const c = client(r.fetch);
  c.view = 'room-detail'; c.roomDetail = { id: 7, name: 'Salon' };
  await c.startRoomScanInRoom();
  const key = c.roomLeaseRef.current.sessionKey;
  c.goTo('home'); await flush();
  assert.deepEqual(r.releases().map(x => [x.url, x.body.action, x.body.sessionKey]), [['/api/rooms/7/scan', 'release', key]]);
  c.goTo('rooms'); await flush();
  assert.equal(r.releases().length, 1); // The new session holds no lease.
});

test('E2E §4.2: real work is never released on exit (photos, uploads, saved analysis, resumed scan)', async () => {
  for (const setup of [
    c => { c.updateRoomPhotos(() => [{ id: 'p', file: photo('A'), url: 'blob:p' }]); },
    c => { c.roomUploadsRef.current.set('p', Promise.resolve(1)); },
    c => { c.roomReceiptRef.current = { ...receipt, roomId: 7 }; },
    c => { c.roomSaveFlowRef.current = {}; },
    c => { c.roomLeaseRef.current = { ...c.roomLeaseRef.current, analysisId: 9 }; },
  ]) {
    const r = scanRecorder(); const c = client(r.fetch);
    c.view = 'room-detail'; c.roomDetail = { id: 7, name: 'Salon' };
    await c.startRoomScanInRoom();
    setup(c);
    c.goTo('home'); await flush();
    assert.equal(r.releases().length, 0);
  }
});

test('E2E §4.2: begin that completes after the user left is released', async () => {
  const begin = deferred(); const r = scanRecorder(begin.promise); const c = client(r.fetch);
  c.view = 'room-detail'; c.roomDetail = { id: 7, name: 'Salon' };
  const task = c.startRoomScanInRoom(); await flush();
  const key = r.calls.find(x => x.body?.action === 'begin').body.sessionKey;
  c.goTo('home');
  begin.resolve(response({ active: true, generation: 5, sessionKey: key })); await task; await flush();
  assert.deepEqual(r.releases().map(x => x.body.sessionKey), [key]);
  assert.equal(c.view, 'home');
});

test('E2E §4.2: stale empty reservation is not described as a resumable scan', async () => {
  for (const [status, resumable] of [[{ analysisId: null, orphanToken: null }, false], [{ analysisId: 3, orphanToken: null }, true]]) {
    const messages = [];
    const c = client(async (url, options = {}) => options.method ? response({ active: true, generation: 2 })
      : response({ active: true, generation: 1, sessionKey: 'someone-else', ...status }));
    c.window.confirm = m => { messages.push(m); return false; };
    assert.equal(await c.reserveRoomScan(7, 'session-key'), false);
    assert.equal(messages.length, 1);
    assert.equal(/Taramaya Devam Et/.test(messages[0]), resumable);
  }
});
