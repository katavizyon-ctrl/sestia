// "Bana öneri ver": persistence for Sestia's improvement ideas on one room
// photo (layout, colour, light, decor, storage, DIY) plus the follow-up
// conversation about them. Self-contained factory (same shape as
// toparlaStore.cjs / creationStore.cjs) so a fresh in-memory DB can be used in
// tests without touching the app's real database.
//
// Deliberately separate from room_analyses: an analysis is a per-item
// keep/sell/donate decision list, a suggestion is a set of ideas for the
// room itself — neither is ever read as the other.

function createRoomSuggestionStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS room_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    source_photo_id INTEGER NOT NULL REFERENCES room_photos(id),
    summary TEXT NOT NULL,
    ideas_json TEXT NOT NULL,
    messages_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS room_suggestions_room ON room_suggestions(room_id, device_id)');

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

  // Ownership is re-checked here, not only by the caller: a suggestion row can
  // never point at a room or photo this device does not own.
  function create(deviceId, roomId, photoId, { summary, ideas }) {
    if (!getOwnedPhoto(photoId, roomId, deviceId)) return null;
    const info = db.prepare(
      'INSERT INTO room_suggestions (room_id, device_id, source_photo_id, summary, ideas_json) VALUES (?, ?, ?, ?, ?)'
    ).run(roomId, deviceId, photoId, summary, JSON.stringify(ideas));
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

  return { getOwnedPhoto, create, get, listForRoom, saveMessages };
}

module.exports = { createRoomSuggestionStore };
