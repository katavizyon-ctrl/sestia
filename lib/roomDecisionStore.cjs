const { createHash } = require('node:crypto');
// No connection is opened here. Production and isolated tests inject their DB.
function createRoomDecisionStore(db, { recordDecisions, getState, saveAnalysis, saveScan }) {
  db.transaction(() => {
  const columns = db.prepare('PRAGMA table_info(room_analyses)').all().map(c => c.name);
  for (const [name, type] of Object.entries({
    draft_items_json: 'TEXT', suggestions_json: 'TEXT', confirmation_json: 'TEXT',
    revision: 'INTEGER NOT NULL DEFAULT 0', closed: 'INTEGER NOT NULL DEFAULT 0', close_reason: 'TEXT',
  })) {
    if (!columns.includes(name)) db.exec(`ALTER TABLE room_analyses ADD COLUMN ${name} ${type}`);
  }
  }).immediate();
  const fail = (code, status = 409) => { throw Object.assign(new Error(code), { status }); };
  const owned = (roomId, owner, id) => {
    const row = db.prepare('SELECT * FROM room_analyses WHERE id=? AND room_id=? AND device_id=?').get(id, roomId, owner);
    if (!row || !db.prepare('SELECT 1 FROM rooms WHERE id=? AND device_id=?').get(roomId, owner)) fail('not_found', 404);
    return row;
  };
  const editable = (row, revision) => {
    if (row.closed || row.final_items_json || row.confirmation_json) fail('analysis_closed');
    if (!Number.isInteger(revision) || revision !== row.revision) fail('revision_conflict');
  };
  const receipt = row => ({ analysisId: row.id, revision: row.revision, sessionKey: row.session_key });
  const overlay = row => {
    const suggestions = row.suggestions_json ? JSON.parse(row.suggestions_json) : [];
    return JSON.parse(row.draft_items_json || row.items_json).map(item => ({
      ...item, modelSuggestion: suggestions.find(s => s.id === item.id)?.modelSuggestion || null,
    }));
  };
  db.exec(`CREATE TABLE IF NOT EXISTS room_scan_heads (
    room_id INTEGER PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    generation INTEGER NOT NULL DEFAULT 0, session_key TEXT
  )`);
  const checkOwner = (roomId, owner) => {
    if (!db.prepare('SELECT 1 FROM rooms WHERE id=? AND device_id=?').get(roomId, owner)) fail('not_found', 404);
  };
  const orphanToken = row => createHash('sha256').update(JSON.stringify(row)).digest('hex');
  function status(roomId, owner) {
    checkOwner(roomId, owner);
    const head = db.prepare('SELECT * FROM room_scan_heads WHERE room_id=?').get(roomId);
    const scan = db.prepare('SELECT * FROM room_scans WHERE room_id=? AND device_id=?').get(roomId, owner);
    const analysis = scan?.analysis_id ? owned(roomId, owner, scan.analysis_id) : null;
    return { generation: head?.generation || 0, sessionKey: head?.session_key || analysis?.session_key || null,
      active: !!(head?.session_key || scan), analysisId: analysis?.id || null,
      orphanToken: scan && !analysis ? orphanToken(scan) : null };
  }
  function retire(roomId, owner) {
    const scan = db.prepare('SELECT * FROM room_scans WHERE room_id=? AND device_id=?').get(roomId, owner);
    if (!scan) return;
    let id = scan.analysis_id;
    if (!id) {
      // Preserve the legacy snapshot without guessing photo or decision links.
      id = saveAnalysis(roomId, owner, `legacy-${orphanToken(scan)}`, JSON.parse(scan.items_json), JSON.parse(scan.messages_json), []);
      db.prepare('UPDATE room_analyses SET created_at=?, updated_at=? WHERE id=?').run(scan.created_at, scan.updated_at, id);
    }
    db.prepare("UPDATE room_analyses SET closed=1, close_reason=CASE WHEN suggestions_json IS NULL THEN 'legacy_unknown' ELSE 'unconfirmed' END WHERE id=? AND final_items_json IS NULL").run(id);
    db.prepare('DELETE FROM room_scans WHERE room_id=? AND device_id=?').run(roomId, owner);
  }
  function release(roomId, key) {
    db.prepare('UPDATE room_scan_heads SET session_key=NULL, generation=generation+1 WHERE room_id=? AND session_key=?').run(roomId, key);
  }
  const begin = db.transaction((roomId, owner, input) => {
    const current = status(roomId, owner);
    if (current.sessionKey === input.sessionKey) return current;
    if (input.expectedGeneration !== current.generation) fail('session_conflict');
    if (db.prepare('SELECT 1 FROM room_analyses WHERE session_key=?').get(input.sessionKey)) fail('analysis_closed');
    if (current.active && input.replace !== true) fail('active_scan_exists');
    retire(roomId, owner);
    db.prepare(`INSERT INTO room_scan_heads(room_id,generation,session_key) VALUES(?,?,?)
      ON CONFLICT(room_id) DO UPDATE SET generation=excluded.generation, session_key=excluded.session_key`)
      .run(roomId, current.generation + 1, input.sessionKey);
    return status(roomId, owner);
  });
  // Frees only a reservation that never produced an analysis. A late or foreign
  // request is a no-op: it cannot end a newer scan or one that has saved content.
  const releaseEmpty = db.transaction((roomId, owner, input) => {
    checkOwner(roomId, owner);
    const head = db.prepare('SELECT session_key FROM room_scan_heads WHERE room_id=?').get(roomId);
    if (head?.session_key !== input.sessionKey ||
        db.prepare('SELECT 1 FROM room_analyses WHERE session_key=?').get(input.sessionKey) ||
        db.prepare('SELECT 1 FROM room_scans WHERE room_id=?').get(roomId)) return { released: false };
    release(roomId, input.sessionKey);
    return { released: true };
  });
  const closeLegacy = db.transaction((roomId, owner, input) => {
    const current = status(roomId, owner);
    if (!current.orphanToken || current.orphanToken !== input.orphanToken || current.generation !== input.expectedGeneration) fail('session_conflict');
    retire(roomId, owner);
    db.prepare(`INSERT INTO room_scan_heads(room_id,generation) VALUES(?,?)
      ON CONFLICT(room_id) DO UPDATE SET generation=excluded.generation, session_key=NULL`).run(roomId, current.generation + 1);
    return { ok: true };
  });
  const requireActive = (roomId, owner, row, key) => {
    const current = status(roomId, owner);
    if (!current.active || current.sessionKey !== key || (row && current.analysisId !== row.id)) fail('scan_not_active');
  };
  const save = db.transaction((roomId, owner, input) => {
    const existing = db.prepare('SELECT * FROM room_analyses WHERE session_key=?').get(input.sessionKey);
    checkOwner(roomId, owner);
    if (!Array.isArray(input.photoIds) || new Set(input.photoIds).size !== input.photoIds.length ||
        input.photoIds.some(id => !Number.isInteger(id) || !db.prepare('SELECT 1 FROM room_photos WHERE id=? AND room_id=? AND device_id=?').get(id, roomId, owner))) fail('invalid_photo_links', 400);
    if (existing) {
      owned(roomId, owner, existing.id);
      if (existing.closed || existing.final_items_json) fail('analysis_closed');
      requireActive(roomId, owner, existing, input.sessionKey);
      // Exact retransmission after a lost save response is not a new revision.
      if (!existing.closed && !existing.final_items_json && input.revision === existing.revision - 1 &&
          existing.items_json === JSON.stringify(input.items) && existing.draft_items_json === existing.items_json &&
          existing.messages_json === JSON.stringify(input.messages) &&
          existing.photo_ids_json === JSON.stringify(input.photoIds)) return receipt(existing);
      editable(existing, input.revision);
      const active = db.prepare('SELECT analysis_id FROM room_scans WHERE room_id=? AND device_id=?').get(roomId, owner);
      if (active && active.analysis_id !== existing.id) fail('different_active_scan');
    } else {
      if (input.revision !== 0) fail('revision_conflict');
      requireActive(roomId, owner, null, input.sessionKey);
    }
    const id = saveAnalysis(roomId, owner, input.sessionKey, input.items, input.messages, input.photoIds);
    if (!id) fail('not_found', 404);
    // Existing legacy rows deliberately keep NULL: their original AI source is unknown.
    let suggestions = existing?.suggestions_json;
    if (!existing) suggestions = JSON.stringify(input.items.map(i => ({ id: i.id, modelSuggestion: i.modelSuggestion || null })));
    else if (suggestions) {
      const known = JSON.parse(suggestions);
      for (const item of input.items) if (!known.some(s => s.id === item.id)) known.push({ id: item.id, modelSuggestion: item.modelSuggestion || null });
      suggestions = JSON.stringify(known);
    }
    db.prepare('UPDATE room_analyses SET draft_items_json=?, suggestions_json=?, revision=revision+1 WHERE id=?')
      .run(JSON.stringify(input.items), suggestions ?? null, id);
    if (!saveScan(roomId, owner, input.items, input.messages, id)) fail('not_found', 404);
    return receipt(owned(roomId, owner, id));
  });
  const draft = db.transaction((roomId, owner, input) => {
    const row = owned(roomId, owner, input.analysisId);
    requireActive(roomId, owner, row, row.session_key);
    if (row.suggestions_json === null) fail('legacy_confirmation_unknown');
    const old = overlay(row);
    if (!Array.isArray(input.choices) || input.choices.length !== old.length ||
        input.choices.some(c => !c || typeof c !== 'object') ||
        new Set(input.choices.map(c => c.id)).size !== old.length) fail('invalid_choices', 400);
    const items = old.map(item => {
      const choice = input.choices.find(c => c.id === item.id);
      if (!choice || !['tut','sat','bagisla','at','geri_donustur'].includes(choice.recommendation) || typeof choice.excluded !== 'boolean' ||
          (Object.hasOwn(choice, 'manual') && typeof choice.manual !== 'boolean')) fail('invalid_choices', 400);
      // New clients carry explicit intent, even when the value is unchanged.
      // Old protocol-2 clients omit manual: retain their previous behavior and
      // never erase already persisted intent. No legacy data is rewritten.
      return { ...item, recommendation: choice.recommendation, excluded: choice.excluded,
        manual: !!item.manual || (Object.hasOwn(choice, 'manual') ? choice.manual : choice.recommendation !== item.recommendation) };
    });
    if (!row.closed && !row.final_items_json && input.revision === row.revision - 1 &&
        old.every((i, n) => i.recommendation === items[n].recommendation && i.excluded === items[n].excluded && i.manual === items[n].manual)) {
      return { ...receipt(row), items: old };
    }
    editable(row, input.revision);
    db.prepare("UPDATE room_analyses SET draft_items_json=?, revision=revision+1, updated_at=datetime('now') WHERE id=?").run(JSON.stringify(items), row.id);
    db.prepare("UPDATE room_scans SET items_json=?, updated_at=datetime('now') WHERE room_id=? AND device_id=? AND analysis_id=?")
      .run(JSON.stringify(items), roomId, owner, row.id);
    return { ...receipt(owned(roomId, owner, row.id)), items };
  });
  const confirm = db.transaction((roomId, owner, input) => {
    const row = owned(roomId, owner, input.analysisId);
    // A lost HTTP response is safe even if the caller retries an old revision.
    if (row.confirmation_json) return { ...JSON.parse(row.confirmation_json), state: getState(owner), replayed: true };
    editable(row, input.revision);
    // Pre-migration decisions have no analysis ID. Never guess whether an old
    // unsuccessful close followed an already committed decision request.
    if (row.suggestions_json === null) fail('legacy_confirmation_unknown');
    requireActive(roomId, owner, row, row.session_key);
    const items = overlay(row);
    const included = items.filter(i => !i.excluded);
    if (!included.length) fail('no_items', 400);
    const room = db.prepare('SELECT name FROM rooms WHERE id=? AND device_id=?').get(roomId, owner);
    const state = recordDecisions(owner, included.map(i => ({
      category: i.category.slice(0, 60), recommendation: i.recommendation, reasoning: i.reasoning,
      roomId, room: room.name,
    })), 'oda');
    const result = { state, analysisId: row.id, count: included.length, replayed: false };
    db.prepare('UPDATE room_analyses SET final_items_json=?, confirmation_json=?, closed=1 WHERE id=?')
      .run(JSON.stringify(items), JSON.stringify(result), row.id);
    db.prepare('DELETE FROM room_scans WHERE room_id=? AND device_id=? AND analysis_id=?').run(roomId, owner, row.id);
    release(roomId, row.session_key);
    return result;
  });
  const close = db.transaction((roomId, owner, input) => {
    const row = owned(roomId, owner, input.analysisId);
    if (!row.closed && !row.final_items_json) {
      editable(row, input.revision);
      db.prepare("UPDATE room_analyses SET closed=1, close_reason=CASE WHEN suggestions_json IS NULL THEN 'legacy_unknown' ELSE 'unconfirmed' END WHERE id=?").run(row.id);
    }
    db.prepare('DELETE FROM room_scans WHERE room_id=? AND device_id=? AND analysis_id=?').run(roomId, owner, row.id);
    release(roomId, row.session_key);
    return { ok: true };
  });
  function read(roomId, owner, id) {
    const row = owned(roomId, owner, id);
    return { ...receipt(row), items: overlay(row), messages: JSON.parse(row.messages_json), photoIds: JSON.parse(row.photo_ids_json), confirmed: !!row.final_items_json, closed: !!row.closed,
      legacyApprovalUnknown: row.suggestions_json === null };
  }
  return { save, draft, confirm, close, read, begin, closeLegacy, releaseEmpty, status,
    snapshot(roomId, owner, key) {
      const current = status(roomId, owner);
      const row = db.prepare('SELECT id FROM room_analyses WHERE room_id=? AND device_id=? AND session_key=?').get(roomId, owner, key || current.sessionKey);
      return { ...current, analysis: row ? read(roomId, owner, row.id) : null };
    } };
}
module.exports = { createRoomDecisionStore };
