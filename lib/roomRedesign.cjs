// "Odayı yeniden yap" (P5 v1): three furniture layouts on the room's measured
// plan. The plan is the geometric truth and the photos the visual truth: the AI
// estimates the furniture it sees and places it, but whether a layout is
// physically possible is decided here, by geometry, never taken from the AI.
//
// Units are centimetres in the plan's own coordinates (x right, y down, as in
// the editor). A piece of furniture is a w × d box centred on (x, y). At
// rotation 0 its width runs along x and its front faces +y; rotation turns it
// clockwise in 90° steps (90: front faces -x, 180: -y, 270: +x).

const LAYOUT_COUNT = 3;
const MAX_FURNITURE = 30;
const ROTATIONS = [0, 90, 180, 270];
const TOLERANCE = 2; // cm of slack, so touching a wall is not "crossing" it

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '');
const round = (v) => Math.round(v);

// ---------------------------------------------------------------------------
// Plan description for the AI

function wallLength(w) { return Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y); }

function openingCenter(o, w) {
  const t = Math.max(0, Math.min(1, o.t));
  return { x: w.a.x + (w.b.x - w.a.x) * t, y: w.a.y + (w.b.y - w.a.y) * t };
}

function bounds(model) {
  const pts = model.walls.flatMap((w) => [w.a, w.b]);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// photoNumbers: Map photoId -> the number the user sees for that photo.
function describePlan(model, photoNumbers = new Map()) {
  const b = bounds(model);
  const byId = new Map(model.walls.map((w) => [w.id, w]));
  const lines = [
    `Plan sınırları: x ${round(b.minX)}…${round(b.maxX)}, y ${round(b.minY)}…${round(b.maxY)} (genişlik ${round(b.maxX - b.minX)} cm, derinlik ${round(b.maxY - b.minY)} cm).`,
    'Duvarlar (uç noktalar, uzunluk, kalınlık):',
    ...model.walls.map((w) => `- D${w.id}: (${round(w.a.x)}, ${round(w.a.y)}) → (${round(w.b.x)}, ${round(w.b.y)}), ${round(wallLength(w))} cm, kalınlık ${round(w.thickness)} cm`),
  ];
  const openings = model.openings.filter((o) => byId.has(o.wall));
  lines.push(openings.length ? 'Kapı ve pencereler:' : 'Planda kapı ya da pencere yok.');
  for (const o of openings) {
    const c = openingCenter(o, byId.get(o.wall));
    lines.push(`- ${o.type === 'door' ? 'Kapı' : 'Pencere'}: D${o.wall} üzerinde, merkez (${round(c.x)}, ${round(c.y)}), genişlik ${round(o.width)} cm`);
  }
  const markers = (model.photos || []).filter((m) => photoNumbers.has(m.photoId));
  if (markers.length) {
    lines.push('Fotoğrafların plandaki yeri (çekildiği nokta ve bakış yönü; 0° = +x, 90° = +y):');
    for (const m of markers) lines.push(`- Fotoğraf ${photoNumbers.get(m.photoId)}: (${round(m.x)}, ${round(m.y)}) noktasından ${round(m.angle)}° yönüne`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Reading the AI answer: wrong shapes are rejected, never silently repaired.

function normalizeRedesign(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.furniture) || !Array.isArray(raw.layouts)) return null;
  if (!raw.furniture.length || raw.furniture.length > MAX_FURNITURE || raw.layouts.length !== LAYOUT_COUNT) return null;
  const keys = new Set();
  const furniture = [];
  for (const f of raw.furniture) {
    const key = text(f?.key, 20), name = text(f?.name, 80);
    if (!key || keys.has(key) || !name || !finite(f.w) || !finite(f.d) || f.w < 10 || f.d < 10 || f.w > 600 || f.d > 600) return null;
    keys.add(key);
    furniture.push({ key, name, w: round(f.w), d: round(f.d) });
  }
  const layouts = [];
  for (const l of raw.layouts) {
    const title = text(l?.title, 80), idea = text(l?.idea, 500);
    if (!title || !idea || !Array.isArray(l.items) || !Array.isArray(l.removed) || !Array.isArray(l.steps)) return null;
    const used = new Set();
    const items = [];
    for (const it of l.items) {
      if (!it || !keys.has(it.key) || used.has(it.key) || !finite(it.x) || !finite(it.y) || !ROTATIONS.includes(it.rotation)) return null;
      used.add(it.key);
      items.push({ key: it.key, x: round(it.x), y: round(it.y), rotation: it.rotation });
    }
    const removed = [];
    for (const r of l.removed) {
      if (!r || !keys.has(r.key) || used.has(r.key)) return null;
      used.add(r.key);
      removed.push({ key: r.key, reason: text(r.reason, 200) });
    }
    const steps = l.steps.map((s) => text(s, 240)).filter(Boolean).slice(0, 10);
    if (!steps.length) return null;
    layouts.push({ title, idea, items, removed, steps, why: text(l.why, 400) });
  }
  return { furniture, layouts, unseen: text(raw.unseen, 400) };
}

// ---------------------------------------------------------------------------
// Geometry checks

// The axis-aligned footprint of a placed piece.
function footprint(item, f) {
  const turned = item.rotation === 90 || item.rotation === 270;
  const w = turned ? f.d : f.w, d = turned ? f.w : f.d;
  return { x1: item.x - w / 2, y1: item.y - d / 2, x2: item.x + w / 2, y2: item.y + d / 2 };
}

const shrink = (r, by) => ({ x1: r.x1 + by, y1: r.y1 + by, x2: r.x2 - by, y2: r.y2 - by });
const corners = (r) => [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y1 }, { x: r.x2, y: r.y2 }, { x: r.x1, y: r.y2 }];
const rectsOverlap = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

// Separating-axis test for two convex polygons.
function polygonsOverlap(p, q) {
  for (const poly of [p, q]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const nx = b.y - a.y, ny = a.x - b.x;
      const project = (pts) => pts.map((v) => v.x * nx + v.y * ny);
      const pp = project(p), qq = project(q);
      if (Math.max(...pp) <= Math.min(...qq) || Math.max(...qq) <= Math.min(...pp)) return false;
    }
  }
  return true;
}

// A wall as the rectangle it really occupies (its length × its thickness).
function wallPolygon(w) {
  const len = wallLength(w) || 1;
  const nx = -(w.b.y - w.a.y) / len, ny = (w.b.x - w.a.x) / len;
  const h = Math.max(1, (w.thickness || 12) / 2);
  return [
    { x: w.a.x + nx * h, y: w.a.y + ny * h }, { x: w.b.x + nx * h, y: w.b.y + ny * h },
    { x: w.b.x - nx * h, y: w.b.y - ny * h }, { x: w.a.x - nx * h, y: w.a.y - ny * h },
  ];
}

// The floor a door needs to open: its width along the wall, as deep as the
// door is wide, on both sides (which way it swings is not in the plan yet).
function doorZone(o, w) {
  const len = wallLength(w) || 1;
  const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len, nx = -uy, ny = ux;
  const c = openingCenter(o, w), half = o.width / 2, depth = o.width;
  return [
    { x: c.x - ux * half + nx * depth, y: c.y - uy * half + ny * depth }, { x: c.x + ux * half + nx * depth, y: c.y + uy * half + ny * depth },
    { x: c.x + ux * half - nx * depth, y: c.y + uy * half - ny * depth }, { x: c.x - ux * half - nx * depth, y: c.y - uy * half - ny * depth },
  ];
}

// Does a ray from p in direction (dx, dy) hit any wall?
function rayHitsWall(p, dx, dy, walls) {
  for (const w of walls) {
    const ex = w.b.x - w.a.x, ey = w.b.y - w.a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((w.a.x - p.x) * ey - (w.a.y - p.y) * ex) / den;
    const s = ((w.a.x - p.x) * dy - (w.a.y - p.y) * dx) / den;
    if (t > 0 && s >= -0.001 && s <= 1.001) return true;
  }
  return false;
}

// Inside the room: walls on all four sides of the piece's centre. A spot in
// the notch of an L-shaped room, or beyond an open side, has a way out.
function enclosed(p, walls) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => rayHitsWall(p, dx, dy, walls));
}

// Problems with one layout, in plain Turkish, each naming the pieces involved.
function checkLayout(layout, furniture, model) {
  const byKey = new Map(furniture.map((f) => [f.key, f]));
  const wallsById = new Map(model.walls.map((w) => [w.id, w]));
  const issues = [];
  const placed = layout.items.map((it) => ({ it, f: byKey.get(it.key), r: footprint(it, byKey.get(it.key)) }));
  for (const { it, f, r } of placed) {
    if (!enclosed({ x: it.x, y: it.y }, model.walls)) { issues.push({ kind: 'outside', keys: [it.key], text: `${f.name} odanın dışında kalıyor` }); continue; }
    const body = corners(shrink(r, TOLERANCE));
    if (model.walls.some((w) => polygonsOverlap(body, wallPolygon(w)))) issues.push({ kind: 'wall', keys: [it.key], text: `${f.name} bir duvarın içine taşıyor` });
    for (const o of model.openings) {
      const w = wallsById.get(o.wall);
      if (o.type === 'door' && w && polygonsOverlap(body, doorZone(o, w))) issues.push({ kind: 'door', keys: [it.key], text: `${f.name} kapının açılacağı yeri kapatıyor` });
    }
  }
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (rectsOverlap(shrink(placed[i].r, TOLERANCE / 2), shrink(placed[j].r, TOLERANCE / 2))) {
        issues.push({ kind: 'overlap', keys: [placed[i].it.key, placed[j].it.key], text: `${placed[i].f.name} ile ${placed[j].f.name} üst üste biniyor` });
      }
    }
  }
  const covered = new Set([...layout.items.map((i) => i.key), ...layout.removed.map((r) => r.key)]);
  for (const f of furniture) if (!covered.has(f.key)) issues.push({ kind: 'missing', keys: [f.key], text: `${f.name} bu yerleşimde yok (ne yerleştirildi ne çıkarıldı)` });
  return issues;
}

function checkRedesign(redesign, model) {
  return redesign.layouts.map((l) => checkLayout(l, redesign.furniture, model));
}

module.exports = { LAYOUT_COUNT, MAX_FURNITURE, ROTATIONS, describePlan, normalizeRedesign, checkLayout, checkRedesign, footprint, doorZone, enclosed };
