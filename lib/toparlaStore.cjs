// "Toparlanmış halini gör": persistence for generated room-tidying
// visualizations. Self-contained factory (same shape as creationStore.cjs /
// roomDecisionStore.cjs) so a fresh in-memory DB can be used in tests without
// touching the app's real database.
//
// Deliberately a table separate from room_photos — a generated image is
// never written there and never mistaken for an original user photograph.
function createToparlaStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS toparla_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    source_photo_id INTEGER NOT NULL REFERENCES room_photos(id),
    operation_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    model TEXT,
    quality TEXT,
    filename TEXT,
    mime_type TEXT,
    output_width INTEGER,
    output_height INTEGER,
    source_ratio REAL,
    applied_ratio REAL,
    exact_ratio INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(device_id, operation_key)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_toparla_results_room ON toparla_results (room_id, created_at)');

  function toPublic(row) {
    return {
      id: row.id,
      roomId: row.room_id,
      sourcePhotoId: row.source_photo_id,
      status: row.status,
      model: row.model,
      quality: row.quality,
      outputWidth: row.output_width,
      outputHeight: row.output_height,
      sourceRatio: row.source_ratio,
      appliedRatio: row.applied_ratio,
      exactRatio: !!row.exact_ratio,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Same two-factor ownership as room_photos: id must belong to both this
  // room and this device.
  function getOwnedPhoto(photoId, roomId, deviceId) {
    return db.prepare('SELECT id, filename, mime_type AS mimeType FROM room_photos WHERE id = ? AND room_id = ? AND device_id = ?').get(photoId, roomId, deviceId);
  }

  // Claims the operation BEFORE any paid API call. UNIQUE(device_id,
  // operation_key) guarantees a second call with the same key can never open
  // a second row / trigger a second paid request — it always finds this same
  // row (whatever its current status) instead.
  function claimGeneration(deviceId, roomId, photoId, operationKey, { model, quality }) {
    const owns = db.prepare('SELECT id FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
    if (!owns) return { error: 'room_not_found' };
    const photo = getOwnedPhoto(photoId, roomId, deviceId);
    if (!photo) return { error: 'photo_not_found' };

    const claim = db.transaction(() => {
      const info = db.prepare(
        `INSERT INTO toparla_results (room_id, device_id, source_photo_id, operation_key, status, model, quality)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)
         ON CONFLICT(device_id, operation_key) DO NOTHING`
      ).run(roomId, deviceId, photoId, operationKey, model, quality);
      const row = db.prepare('SELECT * FROM toparla_results WHERE device_id = ? AND operation_key = ?').get(deviceId, operationKey);
      return { justCreated: info.changes === 1, row };
    }).immediate();

    if (!claim.justCreated && (claim.row.room_id !== roomId || claim.row.source_photo_id !== photoId)) {
      // Same key reused for a different room/photo — reject rather than
      // silently generating from (or reporting) the wrong source image.
      return { error: 'operation_content_conflict' };
    }
    return { justCreated: claim.justCreated, row: toPublic(claim.row), photo };
  }

  // Only a still-'pending' row can be finalized — a race between two
  // responses for the same row can never have the loser overwrite the winner.
  function finalizeGeneration(id, deviceId, patch) {
    if (patch.status === 'completed') {
      const info = db.prepare(
        `UPDATE toparla_results SET status='completed', filename=?, mime_type=?, output_width=?, output_height=?,
          source_ratio=?, applied_ratio=?, exact_ratio=?, updated_at=datetime('now')
         WHERE id = ? AND device_id = ? AND status='pending'`
      ).run(patch.filename, patch.mimeType, patch.outputWidth, patch.outputHeight,
        patch.sourceRatio ?? null, patch.appliedRatio ?? null, patch.exact ? 1 : 0, id, deviceId);
      return info.changes > 0;
    }
    const info = db.prepare(
      `UPDATE toparla_results SET status='failed', error_message=?, updated_at=datetime('now') WHERE id = ? AND device_id = ? AND status='pending'`
    ).run(patch.errorMessage || 'unknown_error', id, deviceId);
    return info.changes > 0;
  }

  function getResult(id, deviceId) {
    const row = db.prepare('SELECT * FROM toparla_results WHERE id = ? AND device_id = ?').get(id, deviceId);
    return row ? toPublic(row) : null;
  }

  // Called right before serving the result's bytes — same principle as
  // getRoomPhotoFile: a device_id mismatch never even touches the filesystem,
  // and only a completed result has bytes to serve.
  function getResultFile(id, deviceId) {
    return db.prepare("SELECT filename, mime_type AS mimeType FROM toparla_results WHERE id = ? AND device_id = ? AND status = 'completed'").get(id, deviceId) || null;
  }

  return { getOwnedPhoto, claimGeneration, finalizeGeneration, getResult, getResultFile };
}

module.exports = { createToparlaStore };
