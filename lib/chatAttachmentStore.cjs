// Brand-new photos attached from the global Sestia chat (no room context
// yet). Deliberately minimal and separate from room_photos — attaching a
// photo to a conversation is not the same product action as adding it to a
// room, and never silently becomes one. Same factory shape as
// creationStore.cjs/toparlaStore.cjs for the same reason: testable with a
// fresh in-memory DB, no import of the app's real database.
function createChatAttachmentStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS chat_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  function create(deviceId, filename, mimeType) {
    const info = db.prepare('INSERT INTO chat_attachments (device_id, filename, mime_type) VALUES (?, ?, ?)').run(deviceId, filename, mimeType);
    return { id: info.lastInsertRowid, mimeType };
  }

  // device_id mismatch -> null, filesystem never touched — same principle as
  // getRoomPhotoFile/toparlaStore.getResultFile.
  function getOwned(id, deviceId) {
    return db.prepare('SELECT id, filename, mime_type AS mimeType FROM chat_attachments WHERE id = ? AND device_id = ?').get(id, deviceId) || null;
  }

  return { create, getOwned };
}

module.exports = { createChatAttachmentStore };
