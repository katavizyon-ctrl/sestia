// "Oda Planı" (Blueprint Lab v1): server-side check of a room blueprint before
// it is saved. No implicit coercion: a field of the wrong type rejects the
// whole model instead of being silently fixed. Units are centimetres.
const MAX_BLUEPRINT_BYTES = 1024 * 1024;
const MAX_ITEMS = 4000;
const MAX_PHOTO_MARKERS = 200;
const OPENING_TYPES = ['door', 'window'];

const finite = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000000;
const validPoint = (p) => !!p && typeof p === 'object' && !Array.isArray(p) && finite(p.x) && finite(p.y);
const validId = (id) => Number.isSafeInteger(id) && id >= 1;

function validBlueprint(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m) || !Array.isArray(m.walls) || !Array.isArray(m.openings) || !validId(m.next)) return false;
  if (m.walls.length > MAX_ITEMS || m.openings.length > MAX_ITEMS) return false;
  // P2: photo markers (where a room photo was taken from, and which way it
  // faces) are optional; older plans have none.
  if (m.photos !== undefined && (!Array.isArray(m.photos) || m.photos.length > MAX_PHOTO_MARKERS)) return false;
  const ids = new Set();
  const wallIds = new Set();
  let maxId = 0;
  for (const w of m.walls) {
    if (!w || typeof w !== 'object' || !validId(w.id) || ids.has(w.id) || !validPoint(w.a) || !validPoint(w.b) || !finite(w.thickness) || w.thickness < 2 || w.thickness > 200) return false;
    ids.add(w.id); wallIds.add(w.id); maxId = Math.max(maxId, w.id);
  }
  for (const o of m.openings) {
    // An opening sits on a wall, never on another opening.
    if (!o || typeof o !== 'object' || !validId(o.id) || ids.has(o.id) || !wallIds.has(o.wall) || !OPENING_TYPES.includes(o.type) || !finite(o.t) || o.t < 0 || o.t > 1 || !finite(o.width) || o.width < 20 || o.width > 100000) return false;
    ids.add(o.id); maxId = Math.max(maxId, o.id);
  }
  const photoIds = new Set();
  for (const p of m.photos || []) {
    // One marker per photo; angle is the facing direction in degrees.
    if (!p || typeof p !== 'object' || !validId(p.id) || ids.has(p.id) || !validId(p.photoId) || photoIds.has(p.photoId) || !finite(p.x) || !finite(p.y) || !finite(p.angle) || Math.abs(p.angle) > 3600) return false;
    ids.add(p.id); photoIds.add(p.photoId); maxId = Math.max(maxId, p.id);
  }
  // The editor hands out new ids from `next`; a stale counter would reuse one.
  return m.next > maxId;
}

// Keeps only the fields the editor understands, so nothing else a client sends
// is stored. Call after validBlueprint.
function normalizeBlueprint(m) {
  return {
    walls: m.walls.map((w) => ({ id: w.id, a: { x: w.a.x, y: w.a.y }, b: { x: w.b.x, y: w.b.y }, thickness: w.thickness })),
    openings: m.openings.map((o) => ({ id: o.id, wall: o.wall, t: o.t, type: o.type, width: o.width })),
    photos: (m.photos || []).map((p) => ({ id: p.id, photoId: p.photoId, x: p.x, y: p.y, angle: ((p.angle % 360) + 360) % 360 })),
    next: m.next,
  };
}

module.exports = { validBlueprint, normalizeBlueprint, MAX_BLUEPRINT_BYTES, MAX_PHOTO_MARKERS };
