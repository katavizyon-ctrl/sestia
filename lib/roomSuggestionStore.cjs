// "Bana öneri ver": persistence for Sestia's improvement ideas on one room
// photo (layout, colour, light, decor, storage, DIY) plus the follow-up
// conversation about them. Self-contained factory (same shape as
// toparlaStore.cjs / creationStore.cjs) so a fresh in-memory DB can be used in
// tests without touching the app's real database.
//
// Deliberately separate from room_analyses: an analysis is a per-item
// keep/sell/donate decision list, a suggestion is a set of ideas for the
// room itself — neither is ever read as the other.

// Adds a column to an existing table, safely when several processes open the
// same database at once (next build loads routes in parallel workers): the
// check is repeated inside an IMMEDIATE transaction, and a column another
// process added first counts as success, not an error.
function ensureColumn(db, table, column, definition) {
  const has = () => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  if (has()) return;
  try {
    db.transaction(() => {
      if (!has()) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }).immediate();
  } catch (error) {
    if (!/duplicate column name/i.test(String(error?.message)) || !has()) throw error;
  }
}

function createRoomSuggestionStore(db) {
  // A fresh database gets every column here; ensureColumn below only upgrades
  // tables created by an earlier version.
  db.exec(`CREATE TABLE IF NOT EXISTS room_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    source_photo_id INTEGER NOT NULL REFERENCES room_photos(id),
    summary TEXT NOT NULL,
    ideas_json TEXT NOT NULL,
    seen_json TEXT NOT NULL DEFAULT '[]',
    missing TEXT,
    goal TEXT,
    story TEXT,
    corrections TEXT,
    messages_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS room_suggestions_room ON room_suggestions(room_id, device_id)');
  // What Sestia saw (older rows: empty list) and could not see.
  ensureColumn(db, 'room_suggestions', 'seen_json', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'room_suggestions', 'missing', 'TEXT');
  // The room goal/story/corrections the suggestion was made for — a snapshot,
  // so changing the room later never rewrites what an old suggestion was about.
  ensureColumn(db, 'room_suggestions', 'goal', 'TEXT');
  ensureColumn(db, 'room_suggestions', 'story', 'TEXT');
  ensureColumn(db, 'room_suggestions', 'corrections', 'TEXT');

  function parseArray(json) {
    try {
      const value = JSON.parse(json);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function toPublic(row, { withMessages = false } = {}) {
    const messages = parseArray(row.messages_json);
    return {
      id: row.id,
      roomId: row.room_id,
      sourcePhotoId: row.source_photo_id,
      goal: row.goal ?? null,
      story: row.story ?? null,
      corrections: row.corrections ?? null,
      seen: parseArray(row.seen_json),
      missing: row.missing || '',
      summary: row.summary,
      ideas: parseArray(row.ideas_json),
      messageCount: messages.length,
      ...(withMessages ? { messages } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Same two-factor ownership as toparlaStore.getOwnedPhoto: the photo must
  // belong to both this room and this device.
  function getOwnedPhoto(photoId, roomId, deviceId) {
    return db.prepare('SELECT id, filename, mime_type AS mimeType FROM room_photos WHERE id = ? AND room_id = ? AND device_id = ?').get(photoId, roomId, deviceId) || null;
  }

  // The room's other photos (oldest first), for looking at the room from more
  // than one angle. Same two-factor ownership as getOwnedPhoto.
  function listRoomPhotos(roomId, deviceId, limit) {
    return db.prepare('SELECT id, filename, mime_type AS mimeType FROM room_photos WHERE room_id = ? AND device_id = ? ORDER BY created_at, id LIMIT ?')
      .all(roomId, deviceId, limit);
  }

  // Ownership is re-checked here, not only by the caller: a suggestion row can
  // never point at a room or photo this device does not own.
  function create(deviceId, roomId, photoId, { seen = [], missing = '', summary, ideas }, { goal = null, story = null, corrections = null } = {}) {
    if (!getOwnedPhoto(photoId, roomId, deviceId)) return null;
    const info = db.prepare(
      'INSERT INTO room_suggestions (room_id, device_id, source_photo_id, summary, ideas_json, seen_json, missing, goal, story, corrections) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(roomId, deviceId, photoId, summary, JSON.stringify(ideas), JSON.stringify(seen), missing || null, goal, story, corrections);
    db.prepare("UPDATE rooms SET updated_at = datetime('now') WHERE id = ?").run(roomId);
    return get(info.lastInsertRowid, deviceId);
  }

  // A device_id mismatch returns null — the existence of someone else's
  // suggestion is never leaked.
  function get(id, deviceId) {
    const row = db.prepare('SELECT * FROM room_suggestions WHERE id = ? AND device_id = ?').get(id, deviceId);
    return row ? toPublic(row, { withMessages: true }) : null;
  }

  // Newest first; the conversation itself is left out of the list (it is
  // loaded with get() only when one suggestion is opened).
  function listForRoom(roomId, deviceId) {
    return db.prepare('SELECT * FROM room_suggestions WHERE room_id = ? AND device_id = ? ORDER BY created_at DESC, id DESC')
      .all(roomId, deviceId).map((row) => toPublic(row));
  }

  // Replaces the stored follow-up conversation (the client always resends the
  // whole validated history, so the latest complete turn is the full record).
  function saveMessages(id, deviceId, messages) {
    if (!Array.isArray(messages)) return false;
    const info = db.prepare(
      "UPDATE room_suggestions SET messages_json = ?, updated_at = datetime('now') WHERE id = ? AND device_id = ?"
    ).run(JSON.stringify(messages), id, deviceId);
    return info.changes === 1;
  }

  // ---------------- one idea: its plan, conversation, to-do and visual ----------------

  db.exec(`CREATE TABLE IF NOT EXISTS room_suggestion_ideas (
    suggestion_id INTEGER NOT NULL REFERENCES room_suggestions(id) ON DELETE CASCADE,
    idea_index INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    plan_json TEXT,
    messages_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (suggestion_id, idea_index)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS room_todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    suggestion_id INTEGER NOT NULL REFERENCES room_suggestions(id) ON DELETE CASCADE,
    idea_index INTEGER NOT NULL,
    area TEXT NOT NULL,
    title TEXT NOT NULL,
    done_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(suggestion_id, idea_index)
  )`);
  // Same claim-before-paid-call discipline as toparla_results, in a table of
  // its own so an idea visual is never listed or served as a Toparla result.
  db.exec(`CREATE TABLE IF NOT EXISTS room_idea_visuals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    suggestion_id INTEGER NOT NULL REFERENCES room_suggestions(id) ON DELETE CASCADE,
    idea_index INTEGER NOT NULL,
    operation_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    model TEXT,
    quality TEXT,
    filename TEXT,
    mime_type TEXT,
    output_width INTEGER,
    output_height INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(device_id, operation_key)
  )`);

  function todoPublic(row) {
    return {
      id: row.id,
      roomId: row.room_id,
      suggestionId: row.suggestion_id,
      ideaIndex: row.idea_index,
      area: row.area,
      title: row.title,
      done: row.done_at != null,
      doneAt: row.done_at,
      createdAt: row.created_at,
    };
  }

  function visualPublic(row) {
    return {
      id: row.id,
      suggestionId: row.suggestion_id,
      ideaIndex: row.idea_index,
      status: row.status,
      outputWidth: row.output_width,
      outputHeight: row.output_height,
      createdAt: row.created_at,
    };
  }

  // The idea always comes from the owned suggestion row; an index the
  // suggestion does not have is "not found", never a guessed idea.
  function getIdea(suggestionId, ideaIndex, deviceId) {
    const suggestion = get(suggestionId, deviceId);
    if (!suggestion || !Number.isInteger(ideaIndex) || ideaIndex < 0 || ideaIndex >= suggestion.ideas.length) return null;
    const row = db.prepare('SELECT plan_json, messages_json FROM room_suggestion_ideas WHERE suggestion_id = ? AND idea_index = ? AND device_id = ?')
      .get(suggestionId, ideaIndex, deviceId);
    const todo = db.prepare('SELECT * FROM room_todos WHERE suggestion_id = ? AND idea_index = ? AND device_id = ?')
      .get(suggestionId, ideaIndex, deviceId);
    const visual = db.prepare("SELECT * FROM room_idea_visuals WHERE suggestion_id = ? AND idea_index = ? AND device_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1")
      .get(suggestionId, ideaIndex, deviceId);
    let plan = null;
    try { plan = row?.plan_json ? JSON.parse(row.plan_json) : null; } catch { plan = null; }
    return {
      suggestion,
      ideaIndex,
      idea: suggestion.ideas[ideaIndex],
      plan,
      messages: parseArray(row?.messages_json ?? '[]'),
      todo: todo ? todoPublic(todo) : null,
      visual: visual ? visualPublic(visual) : null,
    };
  }

  // The first stored plan wins: two overlapping taps can never swap the plan
  // the user is already reading.
  function savePlan(suggestionId, ideaIndex, deviceId, plan) {
    if (!getIdea(suggestionId, ideaIndex, deviceId)) return null;
    db.prepare(
      `INSERT INTO room_suggestion_ideas (suggestion_id, idea_index, device_id, plan_json) VALUES (?, ?, ?, ?)
       ON CONFLICT(suggestion_id, idea_index) DO UPDATE SET plan_json = COALESCE(room_suggestion_ideas.plan_json, excluded.plan_json), updated_at = datetime('now')`
    ).run(suggestionId, ideaIndex, deviceId, JSON.stringify(plan));
    return getIdea(suggestionId, ideaIndex, deviceId).plan;
  }

  function saveIdeaMessages(suggestionId, ideaIndex, deviceId, messages) {
    if (!Array.isArray(messages) || !getIdea(suggestionId, ideaIndex, deviceId)) return false;
    db.prepare(
      `INSERT INTO room_suggestion_ideas (suggestion_id, idea_index, device_id, messages_json) VALUES (?, ?, ?, ?)
       ON CONFLICT(suggestion_id, idea_index) DO UPDATE SET messages_json = excluded.messages_json, updated_at = datetime('now')`
    ).run(suggestionId, ideaIndex, deviceId, JSON.stringify(messages));
    return true;
  }

  // Adding the same idea twice returns the existing item instead of a copy.
  function addTodo(suggestionId, ideaIndex, deviceId) {
    const found = getIdea(suggestionId, ideaIndex, deviceId);
    if (!found) return null;
    db.prepare(
      `INSERT INTO room_todos (room_id, device_id, suggestion_id, idea_index, area, title) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(suggestion_id, idea_index) DO NOTHING`
    ).run(found.suggestion.roomId, deviceId, suggestionId, ideaIndex, found.idea.area, found.idea.title);
    return todoPublic(db.prepare('SELECT * FROM room_todos WHERE suggestion_id = ? AND idea_index = ? AND device_id = ?').get(suggestionId, ideaIndex, deviceId));
  }

  function setTodoDone(todoId, roomId, deviceId, done) {
    const info = db.prepare(
      "UPDATE room_todos SET done_at = CASE WHEN ? THEN COALESCE(done_at, datetime('now')) ELSE NULL END WHERE id = ? AND room_id = ? AND device_id = ?"
    ).run(done ? 1 : 0, todoId, roomId, deviceId);
    if (info.changes !== 1) return null;
    return todoPublic(db.prepare('SELECT * FROM room_todos WHERE id = ?').get(todoId));
  }

  function removeTodo(todoId, roomId, deviceId) {
    return db.prepare('DELETE FROM room_todos WHERE id = ? AND room_id = ? AND device_id = ?').run(todoId, roomId, deviceId).changes === 1;
  }

  // Open items first, then done ones; oldest first within each group.
  function listTodos(roomId, deviceId) {
    return db.prepare('SELECT * FROM room_todos WHERE room_id = ? AND device_id = ? ORDER BY done_at IS NOT NULL, created_at, id')
      .all(roomId, deviceId).map(todoPublic);
  }

  // Claims the operation BEFORE the paid image call. UNIQUE(device_id,
  // operation_key) means a repeated submission always finds this same row
  // instead of opening a second paid request.
  function claimVisual(suggestionId, ideaIndex, deviceId, operationKey, { model, quality }) {
    const found = getIdea(suggestionId, ideaIndex, deviceId);
    if (!found) return { error: 'not_found' };
    const photo = getOwnedPhoto(found.suggestion.sourcePhotoId, found.suggestion.roomId, deviceId);
    if (!photo) return { error: 'not_found' };
    const claim = db.transaction(() => {
      const info = db.prepare(
        `INSERT INTO room_idea_visuals (device_id, suggestion_id, idea_index, operation_key, model, quality) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(device_id, operation_key) DO NOTHING`
      ).run(deviceId, suggestionId, ideaIndex, operationKey, model, quality);
      return { justCreated: info.changes === 1, row: db.prepare('SELECT * FROM room_idea_visuals WHERE device_id = ? AND operation_key = ?').get(deviceId, operationKey) };
    }).immediate();
    if (!claim.justCreated && (claim.row.suggestion_id !== suggestionId || claim.row.idea_index !== ideaIndex)) {
      return { error: 'operation_content_conflict' };
    }
    return { justCreated: claim.justCreated, row: visualPublic(claim.row), photo, idea: found.idea };
  }

  // Only a still-pending row can be finalized, so a late duplicate response
  // can never overwrite the outcome that already landed.
  function finalizeVisual(id, deviceId, patch) {
    if (patch.status === 'completed') {
      db.prepare(
        `UPDATE room_idea_visuals SET status = 'completed', filename = ?, mime_type = ?, output_width = ?, output_height = ?, updated_at = datetime('now')
         WHERE id = ? AND device_id = ? AND status = 'pending'`
      ).run(patch.filename, patch.mimeType, patch.outputWidth, patch.outputHeight, id, deviceId);
    } else {
      db.prepare(
        "UPDATE room_idea_visuals SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ? AND device_id = ? AND status = 'pending'"
      ).run(patch.errorMessage || 'failed', id, deviceId);
    }
    const row = db.prepare('SELECT * FROM room_idea_visuals WHERE id = ? AND device_id = ?').get(id, deviceId);
    return row ? visualPublic(row) : null;
  }

  // Called right before serving bytes: a device mismatch or an unfinished
  // visual never touches the filesystem.
  function getVisualFile(id, deviceId) {
    return db.prepare("SELECT filename, mime_type AS mimeType, suggestion_id AS suggestionId FROM room_idea_visuals WHERE id = ? AND device_id = ? AND status = 'completed'").get(id, deviceId) || null;
  }

  return {
    getOwnedPhoto, listRoomPhotos, create, get, listForRoom, saveMessages,
    getIdea, savePlan, saveIdeaMessages,
    addTodo, setTodoDone, removeTodo, listTodos,
    claimVisual, finalizeVisual, getVisualFile,
  };
}

module.exports = { createRoomSuggestionStore, ensureColumn };
