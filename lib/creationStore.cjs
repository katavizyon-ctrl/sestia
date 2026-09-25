const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };

// Receipt and resource are committed together. No connection is opened here.
function createCreationStore(db, { createRoom, addRoomPhoto, photosDir }) {
  db.exec(`CREATE TABLE IF NOT EXISTS creation_operations (
    owner TEXT NOT NULL, kind TEXT NOT NULL, operation_key TEXT NOT NULL,
    payload_hash TEXT NOT NULL, response_json TEXT,
    PRIMARY KEY(owner,kind,operation_key)
  )`);
  function keyCheck(key) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9-]{8,100}$/.test(key)) fail('operation_key_required', 400);
  }
  function claim(owner, kind, key, digest) {
    keyCheck(key);
    const existing = db.prepare('SELECT * FROM creation_operations WHERE owner=? AND kind=? AND operation_key=?').get(owner, kind, key);
    if (existing && existing.payload_hash !== digest) fail('operation_content_conflict');
    if (existing) return existing.response_json ? JSON.parse(existing.response_json) : null;
    db.prepare('INSERT INTO creation_operations(owner,kind,operation_key,payload_hash) VALUES(?,?,?,?)').run(owner, kind, key, digest);
    return null;
  }
  function complete(owner, kind, key, result) {
    db.prepare('UPDATE creation_operations SET response_json=? WHERE owner=? AND kind=? AND operation_key=?').run(JSON.stringify(result), owner, kind, key);
    return result;
  }
  const room = db.transaction((owner, key, name) => {
    const existing = claim(owner, 'room', key, hash(name));
    if (existing) ownRoom(owner, existing.id);
    return existing || complete(owner, 'room', key, createRoom(owner, name));
  });
  function ownRoom(owner, roomId) {
    if (!db.prepare('SELECT 1 FROM rooms WHERE id=? AND device_id=?').get(roomId, owner)) fail('not_found', 404);
  }
  function active(owner, roomId, sessionKey) {
    if (!sessionKey) return; // Gallery and single-item uploads have no room scan.
    const head = db.prepare('SELECT session_key FROM room_scan_heads WHERE room_id=?').get(roomId);
    if (head?.session_key !== sessionKey) fail('scan_not_active');
  }
  function photo(owner, roomId, key, buffer, mimeType, sessionKey = null) {
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType];
    if (!extension || !Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 20 * 1024 * 1024) fail('invalid_photo', 400);
    const digest = hash(JSON.stringify([roomId, mimeType, sessionKey, hash(buffer)]));
    // Durable claim survives a disk error/crash. A retry cannot change its bytes.
    const existing = db.transaction(() => {
      ownRoom(owner, roomId);
      keyCheck(key);
      const row = db.prepare('SELECT response_json,payload_hash FROM creation_operations WHERE owner=? AND kind=? AND operation_key=?').get(owner, 'photo', key);
      if (row && row.payload_hash !== digest) fail('operation_content_conflict');
      if (row?.response_json) return JSON.parse(row.response_json);
      active(owner, roomId, sessionKey);
      return claim(owner, 'photo', key, digest);
    }).immediate();
    if (existing) return existing;
    return db.transaction(() => {
      ownRoom(owner, roomId);
      const replay = claim(owner, 'photo', key, digest);
      if (replay) return replay;
      active(owner, roomId, sessionKey);
      // Deterministic operation-owned filename, never a client path. A crash
      // before DB commit leaves at most this one recoverable file, not copies.
      const filename = `op-${hash(JSON.stringify([owner, 'photo', key]))}.${extension}`;
      fs.mkdirSync(photosDir, { recursive: true });
      const target = path.join(photosDir, filename);
      fs.writeFileSync(target, buffer);
      const result = addRoomPhoto(roomId, owner, filename, mimeType);
      if (!result) fail('not_found', 404);
      return complete(owner, 'photo', key, result);
    }).immediate();
  }
  return { room: (...args) => room.immediate(...args), photo };
}
module.exports = { createCreationStore };
