import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import roomDecisionStore from './roomDecisionStore.cjs';
import creationStore from './creationStore.cjs';
import toparlaStore from './toparlaStore.cjs';
import chatAttachmentStore from './chatAttachmentStore.cjs';
import { CATEGORIES, selectCategory, getPool, pickIndex } from '@/lib/homeMessages';
import { SESTIA_GREETINGS, SESTIA_SPARKS, pickLibraryIndex } from '@/lib/sestiaLibrary';

// next build collects page data with many workers that all open this file at
// once. Switching to WAL can fail with SQLITE_BUSY without SQLite's busy
// handler ever waiting, which intermittently broke Railway builds — retry
// briefly instead.
function withBusyRetry(fn) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return fn();
    } catch (err) {
      if (err?.code !== 'SQLITE_BUSY' || attempt >= 60) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 + Math.floor(Math.random() * 75));
    }
  }
}

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'), { timeout: 10000 });
withBusyRetry(() => db.pragma('journal_mode = WAL'));

// Multiple Next workers may initialize simultaneously. Lock before inspecting
// columns so the check and additive migration cannot race another connection.
withBusyRetry(() => db.transaction(() => {
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

  -- Asagidaki uc tablo Auth.js'in @auth/drizzle-adapter'i tarafindan
  -- yonetilir (lib/authSchema.js) — kolon adlari/turleri adapterin resmi
  -- SQLite semasiyla birebir eslesmeli, elle degistirilmemeli.
  CREATE TABLE IF NOT EXISTS auth_user (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    emailVerified INTEGER,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS auth_account (
    userId TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    PRIMARY KEY (provider, providerAccountId)
  );

  CREATE TABLE IF NOT EXISTS auth_verificationToken (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires INTEGER NOT NULL,
    PRIMARY KEY (identifier, token)
  );

  -- Hesap Olustur formunda verilen isim, e-posta dogrulanana kadar burada
  -- bekler. E-postaya gore anahtarli (cihaz/oturuma gore DEGIL) — dogrulama
  -- linki baska bir cihazda acilsa bile doğru (ve sadece dogru) hesaba
  -- uygulanir. Suresi Resend saglayicisinin kendi link suresiyle (24 saat)
  -- ayni; bir kez kullanilinca (basarili ya da degil) silinir.
  CREATE TABLE IF NOT EXISTS pending_signup (
    email TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  -- Odalarim. device_id, decisions/users'daki ile ayni anlamda: misafir
  -- token'i ya da hesap id'si — kim olursa olsun sahiplik hep bununla
  -- kontrol edilir.
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cover_photo_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_rooms_device ON rooms (device_id, updated_at);

  -- Fotograflarin kendisi diskte (data/room-photos/<uuid>.<ext>) — burada
  -- sadece kalici dosya adi ve sahiplik bilgisi tutuluyor. Sahiplik hem
  -- room_id'nin hem device_id'nin ayrica kontrol edilmesiyle iki kez
  -- dogrulaniyor (bkz. lib/db.js fonksiyonlari).
  CREATE TABLE IF NOT EXISTS room_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_room_photos_room ON room_photos (room_id);

  -- Bir odanin "tamamlanmis ama henuz karara baglanmamis" oda taramasi.
  -- Oda basina TEK satir (room_id PRIMARY KEY) — yeniden taranirsa uzerine
  -- yazilir. Kararlar onaylaninca (confirmRoomDecisions) bu satir silinir;
  -- artik gercek 'decisions' satirlarina "mezun olmus" demektir.
  CREATE TABLE IF NOT EXISTS room_scans (
    room_id INTEGER PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    items_json TEXT NOT NULL,
    messages_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Bir odanin TAMAMLANMIS her analizi, karara baglanip baglanmadigina
  -- BAKMAKSIZIN buraya kalici olarak yazilir (room_scans'in aksine, oda
  -- basina tek satir DEGIL — zaman icindeki her tarama ayri bir satir).
  -- session_key, ayni canli tarama oturumunun (ilk analiz + sonraki sohbet
  -- turlari) HEP AYNI satiri guncellemesini, buna karsin gercekten yeni bir
  -- taramanin HER ZAMAN yeni bir satir acmasini saglayan UNIQUE anahtar —
  -- ayrica ayni istegin tekrarlanmasi (agi yeniden deneme vb.) da bu sayede
  -- kopya satir olusturmaz (bkz. lib/db.js saveRoomAnalysis).
  CREATE TABLE IF NOT EXISTS room_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    session_key TEXT NOT NULL UNIQUE,
    items_json TEXT NOT NULL,
    messages_json TEXT NOT NULL DEFAULT '[]',
    photo_ids_json TEXT NOT NULL DEFAULT '[]',
    final_items_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_room_analyses_room ON room_analyses (room_id, created_at);
`);

// Var olan veritabanlarında (room etiketi eklenmeden önce oluşturulmuş) eksik sütunu tamamla.
const decisionColumns = db.prepare("PRAGMA table_info(decisions)").all().map((c) => c.name);
if (!decisionColumns.includes('room')) {
  db.exec("ALTER TABLE decisions ADD COLUMN room TEXT NOT NULL DEFAULT 'Genel'");
}
// Mevcut serbest-metin 'room' alanina DOKUNMADAN, kararlari gercek bir
// Odalarim kaydina baglamak icin ek, nullable bir sutun.
if (!decisionColumns.includes('room_id')) {
  db.exec('ALTER TABLE decisions ADD COLUMN room_id INTEGER REFERENCES rooms(id)');
}

// room_analyses tablosu final_items_json olmadan olusturulmus olabilir
// (onceki tur) — eksikse tamamla.
const roomAnalysesColumns = db.prepare("PRAGMA table_info(room_analyses)").all().map((c) => c.name);
if (!roomAnalysesColumns.includes('final_items_json')) {
  db.exec('ALTER TABLE room_analyses ADD COLUMN final_items_json TEXT');
}
// room_scans, aktif oturumun HANGI kalici room_analyses satirina karsilik
// geldigini tutar — resumeRoomScan sonrasi kullanicinin yaptigi manuel
// degisiklikleri (hariç tutma/oneri degistirme) karar onaylandiginda
// DOGRU kalici satira yazabilmek icin (bkz. finalizeRoomAnalysis).
const roomScansColumns = db.prepare("PRAGMA table_info(room_scans)").all().map((c) => c.name);
if (!roomScansColumns.includes('analysis_id')) {
  db.exec('ALTER TABLE room_scans ADD COLUMN analysis_id INTEGER REFERENCES room_analyses(id)');
}

// Sestia Kütüphanesi'nin "aynı ziyarette aynı seçim, yeni ziyarette
// çeşitlilik mümkün" kuralını uygulayabilmesi için — bkz. getSestiaLibrarySelection.
const messageStateColumns = db.prepare("PRAGMA table_info(message_state)").all().map((c) => c.name);
if (!messageStateColumns.includes('visit_token')) {
  db.exec('ALTER TABLE message_state ADD COLUMN visit_token TEXT');
}
}).immediate());

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

// Keşif (totalDecisions===0) eskiden TEK basina "gercek calisma" sinyaliydi,
// ama bir kullanici oda olusturmus/fotograf yuklemis/analiz yaptirmis olup
// hicbir NIHAI karar vermemis olabilir — bu kisi Kesif'e geri dusmemeli
// (bkz. gorev brief'i Bolum 7). room_photos/room_scans/room_analyses hepsi
// rooms(id)'e FK ile bagli oldugundan, bu cihaza ait TEK bir rooms satirinin
// var olup olmadigini kontrol etmek ucunu de kapsar — veri modelinde
// olmayan ayri bir "calismaya baslandi" alani icat etmiyoruz.
export function hasStartedRealWork(deviceId) {
  const user = getOrCreateUser(deviceId);
  if (user.total_decisions > 0) return true;
  return Boolean(db.prepare('SELECT 1 FROM rooms WHERE device_id = ? LIMIT 1').get(deviceId));
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
    'INSERT INTO decisions (device_id, category, recommendation, reasoning, source, room, room_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const update = db.prepare(
    'UPDATE users SET streak = ?, last_active_date = ?, points = ?, total_decisions = ? WHERE device_id = ?'
  );
  const ownsRoom = db.prepare('SELECT 1 FROM rooms WHERE id = ? AND device_id = ?');
  const touchRoom = db.prepare("UPDATE rooms SET updated_at = datetime('now') WHERE id = ?");

  const run = db.transaction((rows) => {
    for (const item of rows) {
      // item.roomId client'tan geliyor — asla dogrudan guvenilmez, bu
      // device_id'nin GERCEKTEN o odanin sahibi oldugu her seferinde
      // kontrol edilir. Degilse sessizce null'a duser (hata firlatmaz,
      // karar yine de kaydedilir, sadece odayla iliskilendirilmez).
      let roomId = null;
      if (item.roomId && ownsRoom.get(item.roomId, deviceId)) {
        roomId = item.roomId;
      }
      insert.run(deviceId, item.category, item.recommendation, item.reasoning || '', source, item.room || 'Genel', roomId);
      if (roomId) touchRoom.run(roomId);
    }
    update.run(streak, today, points, totalDecisions, deviceId);
  });
  run(items);

  return { streak, points, totalDecisions, lastActiveDate: today };
}

// ---------------- odalarim ----------------

export function createRoom(deviceId, name) {
  const info = db.prepare('INSERT INTO rooms (device_id, name) VALUES (?, ?)').run(deviceId, name);
  return getRoomSummary(info.lastInsertRowid, deviceId);
}

export function getRoomsForDevice(deviceId) {
  return db
    .prepare(
      `SELECT r.id, r.name, r.created_at, r.updated_at,
              (SELECT COUNT(*) FROM decisions d WHERE d.room_id = r.id) AS decisionCount,
              (SELECT p.id FROM room_photos p WHERE p.room_id = r.id ORDER BY p.created_at ASC LIMIT 1) AS coverPhotoId
       FROM rooms r WHERE r.device_id = ? ORDER BY r.updated_at DESC`
    )
    .all(deviceId);
}

function getRoomSummary(roomId, deviceId) {
  return db
    .prepare(
      `SELECT r.id, r.name, r.created_at, r.updated_at,
              (SELECT COUNT(*) FROM decisions d WHERE d.room_id = r.id) AS decisionCount,
              (SELECT p.id FROM room_photos p WHERE p.room_id = r.id ORDER BY p.created_at ASC LIMIT 1) AS coverPhotoId
       FROM rooms r WHERE r.id = ? AND r.device_id = ?`
    )
    .get(roomId, deviceId);
}

// Sahiplik burada tek noktada kontrol ediliyor: device_id eslesmezse oda
// hic bulunamamis gibi null doner (var olan ama baskasina ait bir odanin
// varligi bile sizdirilmiyor).
export function getRoomDetail(roomId, deviceId) {
  const room = db.prepare('SELECT id, name, created_at, updated_at FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
  if (!room) return null;
  const photos = db
    .prepare('SELECT id, mime_type AS mimeType, created_at FROM room_photos WHERE room_id = ? ORDER BY created_at ASC')
    .all(roomId);
  const decisions = db
    .prepare('SELECT id, category, recommendation, reasoning, created_at FROM decisions WHERE room_id = ? ORDER BY created_at DESC')
    .all(roomId);
  const scan = getRoomScan(roomId, deviceId);
  const analyses = getRoomAnalyses(roomId, deviceId);
  return { ...room, photos, decisions, scan, analyses, scanStatus: roomDecisions.status(roomId, deviceId) };
}

// Minimal ownership check, no row shape leaked — reused wherever a caller
// (e.g. lib/chatContext.cjs) only needs a yes/no, not the full room detail.
export function ownsRoom(roomId, deviceId) {
  return !!db.prepare('SELECT id FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
}

// null if not owned/found — callers must treat that as "context invalid",
// never fall back to a guessed or default name.
export function getRoomName(roomId, deviceId) {
  const row = db.prepare('SELECT name FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
  return row ? row.name : null;
}

export function addRoomPhoto(roomId, deviceId, filename, mimeType) {
  const owns = db.prepare('SELECT id FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
  if (!owns) return null;
  const info = db.prepare('INSERT INTO room_photos (room_id, device_id, filename, mime_type) VALUES (?, ?, ?, ?)').run(roomId, deviceId, filename, mimeType);
  db.prepare(
    "UPDATE rooms SET updated_at = datetime('now'), cover_photo_id = COALESCE(cover_photo_id, ?) WHERE id = ?"
  ).run(info.lastInsertRowid, roomId);
  return { id: info.lastInsertRowid, mimeType };
}

// Fotografin BAYTLARINI sunmadan once cagrilir — device_id eslesmezse
// (baskasinin fotografi) null doner, dosyaya hic dokunulmaz.
export function getRoomPhotoFile(photoId, deviceId) {
  return db.prepare('SELECT filename, mime_type AS mimeType FROM room_photos WHERE id = ? AND device_id = ?').get(photoId, deviceId);
}

// ---------------- oda taramasi (karar verilmeden kalici kayit) ----------------

// roomId'nin GERCEKTEN deviceId'ye ait oldugu her seferinde kontrol edilir
// (client'in soyledigi roomId'ye asla dogrudan guvenilmez). Oda basina tek
// satir — yeniden taramak eskisinin uzerine yazar. analysisId, bu aktif
// oturumun HANGI kalici room_analyses satirina karsilik geldigini tutar
// (bkz. finalizeRoomAnalysis) — nullable, cagiran vermezse dokunulmaz.
export function saveRoomScan(roomId, deviceId, items, messages, analysisId = null) {
  const owns = db.prepare('SELECT id FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
  if (!owns) return false;
  db.prepare(
    `INSERT INTO room_scans (room_id, device_id, items_json, messages_json, analysis_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(room_id) DO UPDATE SET items_json = excluded.items_json,
       messages_json = excluded.messages_json, analysis_id = excluded.analysis_id, updated_at = datetime('now')`
  ).run(roomId, deviceId, JSON.stringify(items), JSON.stringify(messages || []), analysisId);
  db.prepare("UPDATE rooms SET updated_at = datetime('now') WHERE id = ?").run(roomId);
  return true;
}

export function getRoomScan(roomId, deviceId) {
  const row = db
    .prepare('SELECT items_json, messages_json, analysis_id AS analysisId, updated_at FROM room_scans WHERE room_id = ? AND device_id = ?')
    .get(roomId, deviceId);
  if (!row) return null;
  try {
    const source = row.analysisId ? roomDecisions.read(roomId, deviceId, row.analysisId) : null;
    return {
      items: source?.items || JSON.parse(row.items_json).map(item => ({ ...item, modelSuggestion: null })),
      revision: source?.revision ?? 0,
      sessionKey: source?.sessionKey ?? null,
      photoIds: source?.photoIds || [],
      legacyApprovalUnknown: source?.legacyApprovalUnknown ?? true,
      messages: JSON.parse(row.messages_json),
      analysisId: row.analysisId,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export function clearRoomScan(roomId, deviceId) {
  db.prepare('DELETE FROM room_scans WHERE room_id = ? AND device_id = ?').run(roomId, deviceId);
}

// ---------------- oda analizleri (kalici gecmis) ----------------

// Client'in gonderdigi fotograf id'lerinden sadece GERCEKTEN bu odaya ve
// bu kimlige ait olanlari kabul eder — dogrulanmamis id asla kalici
// analiz kaydina yazilmaz.
export function verifyRoomPhotoIds(roomId, deviceId, photoIds) {
  const ids = (photoIds || []).filter((n) => Number.isInteger(n));
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id FROM room_photos WHERE room_id = ? AND device_id = ? AND id IN (${placeholders})`)
    .all(roomId, deviceId, ...ids);
  const allowed = new Set(rows.map(r => r.id));
  return ids.filter(id => allowed.has(id));
}

// Bir taramanin TAMAMLANMIS analizini kalici olarak yazar — kararin
// onaylanip onaylanmadigina bakmaksizin. session_key, ayni canli oturumun
// (ilk analiz + sonraki sohbet turleri, hatta ayni istegin tekrari) HEP
// AYNI satiri guncellemesini saglar: INSERT ... ON CONFLICT(session_key)
// bunu tek, atomik (senkron better-sqlite3 cagrisi) bir islemde yapar —
// aradaki hicbir noktada baska JS kodu araya giremeyeceginden yaris
// durumu olusmaz. Gercekten YENI bir tarama, client tarafinda yeni
// (crypto.randomUUID) bir session_key uretecegi icin dogal olarak yeni
// bir satir acar; eski, terk edilmis bir analiz asla bunun uzerine
// yazilmaz.
// Basarili olursa kalici satirin id'sini doner (yeni olusturulmus ya da
// guncellenmis olmasi farketmez) — cagiran (POST /api/rooms/[id]/scan) bu
// id'yi room_scans.analysis_id'ye yazarak aktif oturumu bu kalici satira
// baglar. Basarisizlikta null doner.
export function saveRoomAnalysis(roomId, deviceId, sessionKey, items, messages, photoIds) {
  const owns = db.prepare('SELECT id FROM rooms WHERE id = ? AND device_id = ?').get(roomId, deviceId);
  if (!owns) return null;
  // session_key baskasina (farkli oda/kimlik) aitse -- UUID ile pratikte
  // imkansiz ama -- sessizce onun kaydini guncellemek yerine acikca
  // reddet.
  const existing = db.prepare('SELECT room_id, device_id FROM room_analyses WHERE session_key = ?').get(sessionKey);
  if (existing && (existing.room_id !== roomId || existing.device_id !== deviceId)) return null;
  const verifiedPhotoIds = verifyRoomPhotoIds(roomId, deviceId, photoIds);
  db.prepare(
    `INSERT INTO room_analyses (room_id, device_id, session_key, items_json, messages_json, photo_ids_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(session_key) DO UPDATE SET
       items_json = excluded.items_json,
       messages_json = excluded.messages_json,
       photo_ids_json = excluded.photo_ids_json,
       updated_at = datetime('now')`
  ).run(roomId, deviceId, sessionKey, JSON.stringify(items), JSON.stringify(messages || []), JSON.stringify(verifiedPhotoIds));
  // ON CONFLICT DO UPDATE yolunda lastInsertRowid guvenilir degil (sadece
  // gercek bir INSERT'te dogru satiri gosterir) — bu yuzden ayrica okuyoruz.
  const row = db.prepare('SELECT id FROM room_analyses WHERE session_key = ?').get(sessionKey);
  return row.id;
}

// Kullanicinin manuel degisiklikleri (hariç tutma / oneri degistirme)
// sonucundaki NIHAI durumu, Sestia'nin orijinal degerlendirmesinden
// (items_json) AYRI bir sutuna yazar — kararlar onaylandiginda cagirilir
// (bkz. app/api/rooms/[id]/scan DELETE). Boylece gecmis goruntulendiginde
// ikisi asla birbirine karismaz.
export function finalizeRoomAnalysis(analysisId, roomId, deviceId, finalItems) {
  if (!Number.isInteger(analysisId)) return false;
  const info = db
    .prepare('UPDATE room_analyses SET final_items_json = ? WHERE id = ? AND room_id = ? AND device_id = ?')
    .run(JSON.stringify(finalItems), analysisId, roomId, deviceId);
  return info.changes > 0;
}

export function getRoomAnalyses(roomId, deviceId) {
  const rows = db
    .prepare(
      'SELECT id, closed, close_reason, items_json, suggestions_json, draft_items_json, messages_json, photo_ids_json, final_items_json, created_at, updated_at FROM room_analyses WHERE room_id = ? AND device_id = ? ORDER BY created_at DESC'
    )
    .all(roomId, deviceId);
  return rows
    .map((row) => {
      try {
        return {
          id: row.id,
          closed: !!row.closed,
          closeReason: row.close_reason,
          items: JSON.parse(row.items_json).map(item => ({ ...item,
            modelSuggestion: row.suggestions_json ? JSON.parse(row.suggestions_json).find(s => s.id === item.id)?.modelSuggestion || null : null,
          })),
          draftItems: row.draft_items_json ? JSON.parse(row.draft_items_json) : null,
          messages: JSON.parse(row.messages_json),
          photoIds: JSON.parse(row.photo_ids_json),
          finalItems: row.final_items_json ? JSON.parse(row.final_items_json) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ---------------- hesap olusturma: bekleyen isim ----------------

export function setPendingSignupName(email, displayName) {
  db.prepare(
    `INSERT INTO pending_signup (email, display_name, created_at, expires_at)
     VALUES (?, ?, datetime('now'), datetime('now', '+24 hours'))
     ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name,
       created_at = excluded.created_at, expires_at = excluded.expires_at`
  ).run(email, displayName);
}

// Okur VE siler (tek kullanimlik) — suresi gecmisse null doner, dolu ya da
// bos fark etmez, ayni e-posta icin bekleyen kayit her durumda temizlenir.
export function consumePendingSignupName(email) {
  const row = db.prepare("SELECT display_name FROM pending_signup WHERE email = ? AND expires_at > datetime('now')").get(email);
  db.prepare('DELETE FROM pending_signup WHERE email = ?').run(email);
  return row ? row.display_name : null;
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

const ALLOWED_EVENT_TYPES = ['screen_view', 'mode_selected', 'ai_suggestion_shown', 'decision_confirmed', 'session_start', 'chat_message'];

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

  const { key, subKey } = selectCategory({
    totalDecisions,
    hasRooms: totalDecisions === 0 && hasStartedRealWork(deviceId),
    streak, daysSinceLastActive, sessionDecisions, weekDecisions,
  });
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

// ---------------- sestia kütüphanesi (keşif deneyimi) ----------------

// Aynı device_id + kategori için aynı ziyarette (visitToken eşleşiyorsa)
// AYNI index'i döner — "sayfa yenilemek sürekli başka replik göstermiyor"
// kuralı böyle sağlanıyor. visitToken farklıysa (yeni ziyaret — bkz.
// proxy.js'in mint ettiği oturum-ömürlü sestia_visit cookie'si) yeni bir
// index seçilir (son gösterilenin aynısı hariç — pickLibraryIndex).
function pickForVisit(deviceId, category, poolLength, visitToken) {
  const row = db.prepare('SELECT last_index, visit_token FROM message_state WHERE device_id = ? AND category = ?').get(deviceId, category);
  if (row && visitToken && row.visit_token === visitToken) {
    return row.last_index;
  }
  const lastIndex = row ? row.last_index : -1;
  const index = pickLibraryIndex(poolLength, lastIndex);
  db.prepare(
    `INSERT INTO message_state (device_id, category, last_index, visit_token) VALUES (?, ?, ?, ?)
     ON CONFLICT(device_id, category) DO UPDATE SET last_index = excluded.last_index, visit_token = excluded.visit_token`
  ).run(deviceId, category, index, visitToken || null);
  return index;
}

// Keşif ekranının kişisel karşılaması için: bir karşılama + ondan bağımsız
// yönetilen bir ilham kıvılcımı (bkz. brief Bölüm 2 — "Karşılama ve ilham
// ayrı ayrı yönetilsin"). visitToken yoksa (ör. cookie henüz set edilmemiş
// bir istek) her çağrıda yeni seçim yapılır — en kötü ihtimalle bir kerelik
// tutarsızlık, kırılma değil.
export function getSestiaLibrarySelection(deviceId, visitToken) {
  const greetingIndex = pickForVisit(deviceId, 'sestia_karsilama', SESTIA_GREETINGS.length, visitToken);
  const sparkIndex = pickForVisit(deviceId, 'sestia_kivilcim', SESTIA_SPARKS.length, visitToken);
  return {
    greeting: SESTIA_GREETINGS[greetingIndex],
    spark: SESTIA_SPARKS[sparkIndex],
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

// E-postayla giriş yapmış test kullanıcıları — sahibi panelinde "kim denedi"
// sorusu için. İlk kullanım: uygulamanın users satırı; son giriş: Auth.js'in
// her girişte güncellediği emailVerified.
export function getTesterAccounts() {
  return db.prepare(
    `SELECT a.email, a.name, a.emailVerified AS last_sign_in_ms,
            u.created_at AS first_seen, u.last_active_date, COALESCE(u.total_decisions, 0) AS decisions,
            (SELECT COUNT(*) FROM rooms r WHERE r.device_id = a.id) AS rooms,
            (SELECT COUNT(*) FROM feedback f WHERE f.device_id = a.id) AS feedback,
            (SELECT COUNT(*) FROM events e WHERE e.device_id = a.id AND e.event_type = 'session_start') AS sessions,
            (SELECT COUNT(*) FROM events e WHERE e.device_id = a.id AND e.event_type = 'ai_suggestion_shown') AS analyses,
            (SELECT COUNT(*) FROM events e WHERE e.device_id = a.id AND e.event_type = 'chat_message') AS chats,
            (SELECT MAX(e.created_at) FROM events e WHERE e.device_id = a.id) AS last_activity
     FROM auth_user a LEFT JOIN users u ON u.device_id = a.id
     ORDER BY COALESCE(a.emailVerified, 0) DESC`
  ).all();
}

export function getRecentFeedback(limit = 50) {
  return db.prepare(
    `SELECT f.device_id, a.email, f.message, f.screen, f.created_at
     FROM feedback f LEFT JOIN auth_user a ON a.id = f.device_id ORDER BY f.id DESC LIMIT ?`
  ).all(limit);
}

export function getRecentErrors(limit = 50) {
  return db.prepare(
    `SELECT e.device_id, a.email, e.message, e.screen, e.created_at
     FROM errors e LEFT JOIN auth_user a ON a.id = e.device_id ORDER BY e.id DESC LIMIT ?`
  ).all(limit);
}

export const roomDecisions = roomDecisionStore.createRoomDecisionStore(db, {
  recordDecisions, getState, saveAnalysis: saveRoomAnalysis, saveScan: saveRoomScan,
});

export const creations = creationStore.createCreationStore(db, {
  createRoom, addRoomPhoto, photosDir: path.join(process.cwd(), 'data', 'room-photos'),
});

export const toparla = toparlaStore.createToparlaStore(db);

export const chatAttachments = chatAttachmentStore.createChatAttachmentStore(db);

export default db;
