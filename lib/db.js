import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

export default db;
