// "Toparlanmış halini gör": persistence for generated room-tidying
// visualizations. Self-contained factory (same shape as creationStore.cjs /
// roomDecisionStore.cjs) so a fresh in-memory DB can be used in tests without
// touching the app's real database.
//
// Deliberately a table separate from room_photos — a generated image is
// never written there and never mistaken for an original user photograph.
//
// A result may originate from a room photo (the original, still-supported
// shape) OR a chat attachment shared conversationally with no room involved
// — source_kind distinguishes the two; room_id/source_photo_id are null for
// the latter, chat_attachment_id is null for the former. The generation
// core (lib/openaiImage.cjs) and the claim-before-paid-call/idempotency
// discipline are shared unchanged between both.
//
// deps.getOwnedAttachment(id, deviceId) is injected (not required directly)
// so this store stays decoupled from chatAttachmentStore.cjs, matching this
// codebase's existing dependency-injection convention.
function createToparlaStore(db, deps = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS toparla_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    source_kind TEXT NOT NULL DEFAULT 'room_photo',
    source_photo_id INTEGER REFERENCES room_photos(id),
    chat_attachment_id INTEGER REFERENCES chat_attachments(id),
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

  // Additive migration for a table created before source_kind/
  // chat_attachment_id existed: room_id/source_photo_id were NOT NULL then,
  // which would reject any room-less insert. SQLite has no ALTER COLUMN, so
  // relaxing a NOT NULL constraint requires the standard rename ->
  // recreate -> copy -> drop sequence — done here in one transaction, no
  // row is ever dropped. A no-op once already migrated (or on a fresh DB,
  // which the CREATE TABLE above already gives the new, nullable shape).
  const columns = db.prepare("PRAGMA table_info(toparla_results)").all();
  const roomIdCol = columns.find((c) => c.name === 'room_id');
  const sourcePhotoIdCol = columns.find((c) => c.name === 'source_photo_id');
  const hasSourceKind = columns.some((c) => c.name === 'source_kind');
  if (!hasSourceKind || roomIdCol?.notnull || sourcePhotoIdCol?.notnull) {
    db.transaction(() => {
      db.exec('ALTER TABLE toparla_results RENAME TO toparla_results_pre_chat_source');
      db.exec(`CREATE TABLE toparla_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL,
        source_kind TEXT NOT NULL DEFAULT 'room_photo',
        source_photo_id INTEGER REFERENCES room_photos(id),
        chat_attachment_id INTEGER REFERENCES chat_attachments(id),
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
      db.exec(`INSERT INTO toparla_results
          (id, room_id, device_id, source_kind, source_photo_id, chat_attachment_id, operation_key, status, model, quality,
           filename, mime_type, output_width, output_height, source_ratio, applied_ratio, exact_ratio, error_message, created_at, updated_at)
        SELECT id, room_id, device_id, 'room_photo', source_photo_id, NULL, operation_key, status, model, quality,
           filename, mime_type, output_width, output_height, source_ratio, applied_ratio, exact_ratio, error_message, created_at, updated_at
        FROM toparla_results_pre_chat_source`);
      db.exec('DROP TABLE toparla_results_pre_chat_source');
    }).immediate();
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_toparla_results_room ON toparla_results (room_id, created_at)');

  function toPublic(row) {
    return {
      id: row.id,
      roomId: row.room_id,
      sourceKind: row.source_kind,
      sourcePhotoId: row.source_photo_id,
      chatAttachmentId: row.chat_attachment_id,
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

  function insertPending(deviceId, operationKey, columns_) {
    return db.transaction(() => {
      const info = db.prepare(
        `INSERT INTO toparla_results (room_id, device_id, source_kind, source_photo_id, chat_attachment_id, operation_key, status, model, quality)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
         ON CONFLICT(device_id, operation_key) DO NOTHING`
      ).run(columns_.roomId, deviceId, columns_.sourceKind, columns_.sourcePhotoId, columns_.chatAttachmentId, operationKey, columns_.model, columns_.quality);
      const row = db.prepare('SELECT * FROM toparla_results WHERE device_id = ? AND operation_key = ?').get(deviceId, operationKey);
      return { justCreated: info.changes === 1, row };
    }).immediate();
  }

  // Claims the operation BEFORE any paid API call. UNIQUE(device_id,
  // operation_key) guarantees a second call with the same key can never open
  // a second row / trigger a second paid request — it always finds this same
  // row (whatever its current status) instead. Unchanged from before the
  // chat-attachment bridge: same signature, same behavior, same callers.
  function claimGeneration(deviceId, roomId, photoId, operationKey, { model, quality }) {
    const owns = db.prepare('SELECT id FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
    if (!owns) return { error: 'room_not_found' };
    const photo = getOwnedPhoto(photoId, roomId, deviceId);
    if (!photo) return { error: 'photo_not_found' };

    const claim = insertPending(deviceId, operationKey, { roomId, sourceKind: 'room_photo', sourcePhotoId: photoId, chatAttachmentId: null, model, quality });

    if (!claim.justCreated && (claim.row.room_id !== roomId || claim.row.source_photo_id !== photoId)) {
      // Same key reused for a different room/photo — reject rather than
      // silently generating from (or reporting) the wrong source image.
      return { error: 'operation_content_conflict' };
    }
    return { justCreated: claim.justCreated, row: toPublic(claim.row), photo };
  }

  // Sibling of claimGeneration for a room-less, chat-attachment-originated
  // source. Same claim-before-paid-call discipline, same UNIQUE(device_id,
  // operation_key) idempotency, same replay semantics — only the ownership
  // check and the columns written differ. claimGeneration itself is never
  // touched by this addition.
  function claimGenerationFromAttachment(deviceId, attachmentId, operationKey, { model, quality }) {
    if (typeof deps.getOwnedAttachment !== 'function') throw new Error('getOwnedAttachment dependency required');
    const attachment = deps.getOwnedAttachment(attachmentId, deviceId);
    if (!attachment) return { error: 'attachment_not_found' };

    const claim = insertPending(deviceId, operationKey, { roomId: null, sourceKind: 'chat_attachment', sourcePhotoId: null, chatAttachmentId: attachmentId, model, quality });

    if (!claim.justCreated && (claim.row.source_kind !== 'chat_attachment' || claim.row.chat_attachment_id !== attachmentId)) {
      // Same key reused for a different attachment (or a room_photo claim)
      // — reject rather than silently generating from the wrong source.
      return { error: 'operation_content_conflict' };
    }
    return { justCreated: claim.justCreated, row: toPublic(claim.row), attachment };
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
  // and only a completed result has bytes to serve. Source-kind-agnostic on
  // purpose: the caller already knows which route it came in through.
  function getResultFile(id, deviceId) {
    return db.prepare("SELECT filename, mime_type AS mimeType FROM toparla_results WHERE id = ? AND device_id = ? AND status = 'completed'").get(id, deviceId) || null;
  }

  // Read-only recovery path (Session V2's account-side "check on an accepted
  // operation without a new provider call" requirement, see
  // docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md §16). Metadata
  // only — never a byte response, never claims/generates anything.
  function listOwned(deviceId, { limit = 20 } = {}) {
    const bounded = Math.max(1, Math.min(50, Number(limit) || 20));
    return db.prepare('SELECT * FROM toparla_results WHERE device_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(deviceId, bounded).map(toPublic);
  }

  return { getOwnedPhoto, claimGeneration, claimGenerationFromAttachment, finalizeGeneration, getResult, getResultFile, listOwned };
}

module.exports = { createToparlaStore };
