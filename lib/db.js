import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CATEGORIES, selectCategory, getPool, pickIndex } from '@/lib/homeMessages';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    device_id TEXT PRIMARY KEY,
    streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    total_decisions INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    category TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    reasoning TEXT,
    source TEXT NOT NULL DEFAULT 'tekli',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_device_type ON events (device_id, event_type, created_at);

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    message TEXT NOT NULL,
    screen TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    message TEXT NOT NULL,
    stack TEXT,
    screen TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS message_state (
    device_id TEXT NOT NULL,
    category TEXT NOT NULL,
    last_index INTEGER NOT NULL DEFAULT -1,
    PRIMARY KEY (device_id, category)
  );

  CREATE TABLE IF NOT EXISTS inspiration_cache (
    device_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    decision_count_at_generation INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Var olan veritabanlarında (room etiketi eklenmeden önce oluşturulmuş) eksik sütunu tamamla.
const decisionColumns = db.prepare("PRAGMA table_info(decisions)").all().map((c) => c.name);
if (!decisionColumns.includes('room')) {
  db.exec("ALTER TABLE decisions ADD COLUMN room TEXT NOT NULL DEFAULT 'Genel'");
}

const POINTS_PER_DECISION = 5;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function toPublicState(user) {
  return {
    streak: user.streak,
    points: user.points,
    totalDecisions: user.total_decisions,
    lastActiveDate: user.last_active_date,
  };
}

export function getOrCreateUser(deviceId) {
  let user = db.prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId);
  if (!user) {
    db.prepare('INSERT INTO users (device_id) VALUES (?)').run(deviceId);
    user = db.prepare('SELECT * FROM users WHERE device_id = ?').get(deviceId);
  }
  return user;
}

export function getState(deviceId) {
  return toPublicState(getOrCreateUser(deviceId));
}

// items: [{ category, recommendation, reasoning, room }], source: 'tekli' | 'oda'
export function recordDecisions(deviceId, items, source) {
  const user = getOrCreateUser(deviceId);
  const today = todayISO();

  let streak = user.streak;
  if (user.last_active_date === today) {
    // bugün zaten aktifti, streak değişmez
  } else if (user.last_active_date === yesterdayISO()) {
    streak += 1;
  } else {
    streak = 1;
  }

  const points = user.points + items.length * POINTS_PER_DECISION;
  const totalDecisions = user.total_decisions + items.length;

  const insert = db.prepare(
    'INSERT INTO decisions (device_id, category, recommendation, reasoning, source, room) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const update = db.prepare(
    'UPDATE users SET streak = ?, last_active_date = ?, points = ?, total_decisions = ? WHERE device_id = ?'
  );

  const run = db.transaction((rows) => {
    for (const item of rows) {
      insert.run(deviceId, item.category, item.recommendation, item.reasoning || '', source, item.room || 'Genel');
    }
    update.run(streak, today, points, totalDecisions, deviceId);
  });
  run(items);

  return { streak, points, totalDecisions, lastActiveDate: today };
}

// ---------------- haftalık ilham ----------------

export function getRecentDecisions(deviceId, limit = 30) {
  return db
    .prepare('SELECT category, room, recommendation, created_at FROM decisions WHERE device_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(deviceId, limit);
}

export function getInspirationCache(deviceId) {
  return db.prepare('SELECT payload_json, decision_count_at_generation, created_at FROM inspiration_cache WHERE device_id = ?').get(deviceId);
}

export function setInspirationCache(deviceId, payload, decisionCount) {
  db.prepare(
    `INSERT INTO inspiration_cache (device_id, payload_json, decision_count_at_generation, created_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(device_id) DO UPDATE SET payload_json = excluded.payload_json,
       decision_count_at_generation = excluded.decision_count_at_generation, created_at = excluded.created_at`
  ).run(deviceId, JSON.stringify(payload), decisionCount);
}

// ---------------- telemetri: events / feedback / errors ----------------

const ALLOWED_EVENT_TYPES = ['screen_view', 'mode_selected', 'ai_suggestion_shown', 'decision_confirmed', 'session_start'];

export function logEvent(deviceId, eventType, payload) {
  if (!deviceId || !ALLOWED_EVENT_TYPES.includes(eventType)) return;
  const json = payload !== undefined ? JSON.stringify(payload).slice(0, 2000) : null;
  db.prepare('INSERT INTO events (device_id, event_type, payload_json) VALUES (?, ?, ?)').run(deviceId, eventType, json);
}

export function recordFeedback(deviceId, message, screen) {
  db.prepare('INSERT INTO feedback (device_id, message, screen) VALUES (?, ?, ?)').run(deviceId, message, screen || null);
}

export function recordError(deviceId, message, stack, screen) {
  db.prepare('INSERT INTO errors (device_id, message, stack, screen) VALUES (?, ?, ?, ?)').run(
    deviceId || null,
    message,
    stack || null,
    screen || null
  );
}

// ---------------- ana ekran mesaj sistemi ----------------

export function getHomeMessage(deviceId) {
  const user = getOrCreateUser(deviceId);
  const totalDecisions = user.total_decisions;
  const streak = user.streak;

  let daysSinceLastActive = null;
  if (user.last_active_date) {
    const row = db.prepare("SELECT CAST(julianday('now') - julianday(?) AS INTEGER) as days").get(user.last_active_date);
    daysSinceLastActive = row.days;
  }

  const sessionDecisions = db
    .prepare(
      `SELECT COUNT(*) as c FROM events
       WHERE device_id = ? AND event_type = 'decision_confirmed'
       AND created_at >= COALESCE(
         (SELECT MAX(created_at) FROM events WHERE device_id = ? AND event_type = 'session_start'),
         '0000-01-01'
       )`
    )
    .get(deviceId, deviceId).c;

  const weekDecisions = db
    .prepare("SELECT COUNT(*) as c FROM decisions WHERE device_id = ? AND created_at >= datetime('now', '-7 days')")
    .get(deviceId).c;

  const { key, subKey } = selectCategory({ totalDecisions, streak, daysSinceLastActive, sessionDecisions, weekDecisions });
  const pool = getPool(key, subKey);
  const stateKey = subKey ? `${key}:${subKey}` : key;
  const stateRow = db.prepare('SELECT last_index FROM message_state WHERE device_id = ? AND category = ?').get(deviceId, stateKey);
  const lastIndex = stateRow ? stateRow.last_index : -1;
  const index = pickIndex(pool.length, lastIndex);
  db.prepare(
    `INSERT INTO message_state (device_id, category, last_index) VALUES (?, ?, ?)
     ON CONFLICT(device_id, category) DO UPDATE SET last_index = excluded.last_index`
  ).run(deviceId, stateKey, index);

  const category = CATEGORIES[key];
  return {
    category: key,
    baslik: category.baslik,
    alt_baslik: category.alt_baslik,
    soru: pool[index],
  };
}

// ---------------- admin paneli ----------------

export function getActiveDeviceCount(days = 7) {
  return db.prepare(`SELECT COUNT(*) as c FROM users WHERE last_active_date >= date('now', '-' || ? || ' days')`).get(days).c;
}

export function getDailyUsage(days = 7) {
  return db
    .prepare(
      `SELECT date(created_at) as day, COUNT(*) as count
       FROM decisions
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY day ORDER BY day`
    )
    .all(days);
}

export function getRecentFeedback(limit = 50) {
  return db.prepare('SELECT device_id, message, screen, created_at FROM feedback ORDER BY id DESC LIMIT ?').all(limit);
}

export function getRecentErrors(limit = 50) {
  return db.prepare('SELECT device_id, message, screen, created_at FROM errors ORDER BY id DESC LIMIT ?').all(limit);
}

export default db;
