const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const adminActivity = require('../lib/adminActivity.cjs');
const adminTime = require('../lib/adminTime.cjs');

const { createAdminActivity } = adminActivity;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const T0 = Date.UTC(2026, 8, 29, 18, 0, 0); // 21:00 in Istanbul

// The real application schema, built by running lib/db.js's own bootstrap
// against an in-memory DB (same technique as tests/room-decisions.test.cjs),
// so these tests fail if a column the admin queries rely on is renamed.
function appDb() {
  const db = new Database(':memory:');
  let code = fs.readFileSync(path.join(__dirname, '../lib/db.js'), 'utf8');
  const start = code.indexOf('const dataDir =');
  const end = code.indexOf("withBusyRetry(() => db.pragma('journal_mode = WAL'));");
  assert.ok(start > 0 && end > start, 'connection bootstrap must be explicitly replaced');
  code = code.slice(0, start) + 'const db = __testDb;\n' + code.slice(end);
  code = code.replace(/^import .*;\r?\n/gm, '').replace(/^export default db;?/gm, '').replace(/^export /gm, '');
  const ctx = { __testDb: db, path, process: { cwd: () => '.', env: {} },
    roomDecisionStore: require('../lib/roomDecisionStore.cjs'),
    creationStore: require('../lib/creationStore.cjs'),
    toparlaStore: require('../lib/toparlaStore.cjs'),
    roomSuggestionStore: require('../lib/roomSuggestionStore.cjs'),
    chatAttachmentStore: require('../lib/chatAttachmentStore.cjs'),
    sessionStoreModule: require('../lib/sessionStore.cjs'),
    visitMetadataStoreModule: require('../lib/visitMetadataStore.cjs') };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return db;
}

const sqlTime = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

function fixture(nowMs = T0 + 60 * MIN) {
  const db = appDb();
  const clock = { now: nowMs };
  const captured = [];
  const spy = { prepare: (sql) => { captured.push(sql); return db.prepare(sql); } };
  const admin = createAdminActivity(spy, { now: () => clock.now });
  const families = new Set();
  const f = {
    db, admin, clock, captured,
    account(id, email, name = null, emailVerified = null) {
      db.prepare('INSERT INTO auth_user (id, email, name, emailVerified) VALUES (?, ?, ?, ?)').run(id, email, name, emailVerified);
      return id;
    },
    users(owner, createdMs, lastActiveDate = null) {
      db.prepare('INSERT INTO users (device_id, created_at, last_active_date) VALUES (?, ?, ?)').run(owner, sqlTime(createdMs), lastActiveDate);
    },
    session({ id, family = `fam-${id}`, rev = 1, kind = 'account', subject, created, last = created, ended = null, reason = null,
      reports = 0, internal = false, visit = {} }) {
      if (!families.has(family)) {
        db.prepare('INSERT INTO sestia_session_families (id, revision, created_at_ms, last_transition_at_ms) VALUES (?, 0, ?, ?)').run(family, created, created);
        families.add(family);
      }
      const timeout = kind === 'guest' ? 300000 : 600000;
      const warning = kind === 'guest' ? 180000 : 300000;
      db.prepare(`INSERT INTO sestia_sessions (id, family_id, family_revision, kind, subject_id, policy_version, idle_timeout_ms,
        warning_after_ms, created_at_ms, last_activity_at_ms, idle_expires_at_ms, activity_revision, ended_at_ms, end_reason, creation_key_hash)
        VALUES (?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, family, rev, kind, subject, timeout, warning, created, last, last + timeout, reports, ended, reason, `SECRET-KEYHASH-${id}`);
      db.prepare(`INSERT INTO session_visit_metadata (session_id, captured_at_ms, city, region, country_name, timezone, device_class, os, browser, internal_test)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, created, visit.city ?? 'İstanbul', null, visit.country ?? 'Türkiye', 'Europe/Istanbul',
          visit.device ?? 'mobile', visit.os ?? 'iOS', visit.browser ?? 'Safari', internal ? 1 : 0);
      return id;
    },
    room(owner, name, atMs) {
      return db.prepare('INSERT INTO rooms (device_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(owner, name, sqlTime(atMs), sqlTime(atMs)).lastInsertRowid;
    },
    photo(owner, roomId, atMs) {
      db.prepare('INSERT INTO room_photos (room_id, device_id, filename, mime_type, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(roomId, owner, 'SECRET-FILENAME.jpg', 'image/jpeg', sqlTime(atMs));
    },
    scan(owner, roomId, atMs, state) {
      const secret = JSON.stringify([{ label: 'SECRET-ITEMS', reasoning: 'SECRET-AI-REASONING' }]);
      db.prepare(`INSERT INTO room_analyses (room_id, device_id, session_key, items_json, messages_json, photo_ids_json, final_items_json,
          created_at, updated_at, suggestions_json, draft_items_json, confirmation_json, closed, close_reason)
        VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(roomId, owner, `key-${owner}-${atMs}`, secret, JSON.stringify([{ role: 'user', content: 'SECRET-CONVERSATION' }]),
          state === 'confirmed' ? secret : null, sqlTime(atMs), sqlTime(atMs), secret, secret,
          state === 'confirmed' ? JSON.stringify({ count: 1 }) : null, state === 'open' ? 0 : 1,
          state === 'closed' ? 'unconfirmed' : null);
    },
    decision(owner, recommendation, atMs, roomId = null) {
      db.prepare(`INSERT INTO decisions (device_id, category, recommendation, reasoning, source, room, room_id, created_at)
        VALUES (?, 'Sandalye', ?, 'SECRET-DECISION-REASONING', ?, 'Salon', ?, ?)`).run(owner, recommendation, roomId ? 'oda' : 'tekli', roomId, sqlTime(atMs));
    },
    event(owner, type, atMs, payload = null) {
      db.prepare('INSERT INTO events (device_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)')
        .run(owner, type, payload === null ? null : JSON.stringify(payload), sqlTime(atMs));
    },
    chatPhoto(owner, atMs) {
      db.prepare('INSERT INTO chat_attachments (device_id, filename, mime_type, created_at) VALUES (?, ?, ?, ?)').run(owner, 'SECRET-CHAT-FILE.jpg', 'image/jpeg', sqlTime(atMs));
    },
    toparla(owner, status, atMs) {
      db.prepare(`INSERT INTO toparla_results (device_id, source_kind, operation_key, status, filename, error_message, created_at, updated_at)
        VALUES (?, 'chat_attachment', ?, ?, 'SECRET-TOPARLA-FILE.png', 'SECRET-PROVIDER-ERROR', ?, ?)`)
        .run(owner, `op-${owner}-${atMs}-${status}`, status, sqlTime(atMs), sqlTime(atMs));
    },
    feedback(owner, message, atMs) {
      db.prepare('INSERT INTO feedback (device_id, message, screen, created_at) VALUES (?, ?, ?, ?)').run(owner, message, 'home', sqlTime(atMs));
    },
    error(owner, atMs) {
      db.prepare('INSERT INTO errors (device_id, message, stack, screen, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(owner, 'Render failed', 'SECRET-STACK at foo.js:1', 'home', sqlTime(atMs));
    },
  };
  return f;
}

const byId = (list, id) => list.find((x) => x.id === id);

// ---------------------------------------------------------------- accounts

test('account first/latest login come from Session V2 account sessions', () => {
  const f = fixture();
  f.account('acc-1', 'ayse@example.com', 'Ayşe', T0 - 2 * DAY);
  f.session({ id: 'sess-a1', subject: 'acc-1', created: T0 - 3 * DAY, last: T0 - 3 * DAY + 5 * MIN, ended: T0 - 3 * DAY + 6 * MIN, reason: 'logout' });
  f.session({ id: 'sess-a2', subject: 'acc-1', created: T0 - DAY, last: T0 - DAY + 2 * MIN });
  f.session({ id: 'sess-a3', subject: 'acc-1', created: T0 + 10 * MIN, last: T0 + 12 * MIN });
  const row = byId(f.admin.listAccounts(), 'acc-1');
  assert.equal(row.firstLoginAt, T0 - 3 * DAY);
  assert.equal(row.latestLoginAt, T0 + 10 * MIN);
  assert.equal(row.lastVerifiedEmailAt, T0 - 2 * DAY, 'emailVerified is kept separately, not used as the V2 login');
  assert.equal(row.maskedEmail, 'a***@example.com');
});

test('login count = account sessions, never session_start page-mount events (old "Oturum" bug)', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-1', subject: 'acc-1', created: T0 - DAY });
  f.session({ id: 'sess-2', subject: 'acc-1', created: T0 });
  for (let i = 0; i < 7; i += 1) f.event('acc-1', 'session_start', T0 + i * MIN);
  assert.equal(byId(f.admin.listAccounts(), 'acc-1').loginCount, 2);
});

test('last active comes from sestia_sessions.last_activity_at_ms, not the newest telemetry row', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-1', subject: 'acc-1', created: T0, last: T0 + 4 * MIN, reports: 9 });
  f.event('acc-1', 'screen_view', T0 + 30 * MIN, { screen: 'home' });
  const row = byId(f.admin.listAccounts(), 'acc-1');
  assert.equal(row.lastActiveAt, T0 + 4 * MIN);
  assert.equal(row.interactionSpanMs, 4 * MIN);
  assert.equal(row.activityReports, 9);
});

test('guests are never listed as accounts and are counted separately in the overview', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-acc', subject: 'acc-1', created: T0 });
  f.session({ id: 'sess-g1', kind: 'guest', subject: 'guest-1', created: T0 + MIN });
  f.session({ id: 'sess-g2', kind: 'guest', subject: 'guest-2', created: T0 + 2 * MIN });
  f.room('guest-1', 'Misafir odası', T0 + 2 * MIN);
  const accounts = f.admin.listAccounts();
  assert.deepEqual(accounts.map((a) => a.id), ['acc-1']);
  assert.equal(accounts[0].summary.rooms, 0, 'guest rows never leak into an account');
  const o = f.admin.overview();
  assert.equal(o.activeAccounts, 1);
  assert.equal(o.guestSessions, 2);
  assert.equal(o.meaningfulGuestSessions, 1, 'only the guest that created a room did something meaningful');
});

test('"Active accounts" is Session V2 based, not users.last_active_date (old "Aktif Cihaz" bug)', () => {
  const f = fixture();
  const today = new Date(T0).toISOString().slice(0, 10);
  f.account('acc-browsing', 'b@example.com');
  f.session({ id: 'sess-b', subject: 'acc-browsing', created: T0 - DAY, last: T0 - DAY + MIN });
  f.account('acc-old', 'o@example.com');
  f.users('acc-old', T0 - 40 * DAY, today); // decided "today" per the old counter, but no recent session
  f.session({ id: 'sess-o', subject: 'acc-old', created: T0 - 30 * DAY });
  const o = f.admin.overview();
  assert.equal(o.activeAccounts, 1);
  assert.equal(o.accountLogins, 1);
});

test('room, photo and room-scan counts with confirmed / closed / open status', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  const r1 = f.room('acc-1', 'Salon', T0);
  const r2 = f.room('acc-1', 'Mutfak', T0 + MIN);
  f.photo('acc-1', r1, T0 + 2 * MIN);
  f.photo('acc-1', r1, T0 + 3 * MIN);
  f.scan('acc-1', r1, T0 + 4 * MIN, 'confirmed');
  f.scan('acc-1', r2, T0 + 5 * MIN, 'closed');
  f.scan('acc-1', r2, T0 + 6 * MIN, 'open');
  const s = byId(f.admin.listAccounts(), 'acc-1').summary;
  assert.equal(s.rooms, 2);
  assert.equal(s.roomPhotos, 2);
  assert.deepEqual(s.roomScans, { total: 3, confirmed: 1, closed: 1, open: 1 });
});

test('decisions are broken down by all five recommendations', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  const plan = { tut: 3, sat: 1, bagisla: 2, geri_donustur: 1, at: 4 };
  let t = T0;
  for (const [rec, n] of Object.entries(plan)) for (let i = 0; i < n; i += 1) f.decision('acc-1', rec, (t += MIN));
  assert.deepEqual(byId(f.admin.listAccounts(), 'acc-1').summary.decisions, { total: 11, ...plan });
});

test('chat turns count only chat_message; room scans come from room_analyses, not ai_suggestion_shown (old "Analiz" bug)', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  const room = f.room('acc-1', 'Salon', T0);
  f.scan('acc-1', room, T0 + MIN, 'confirmed');
  f.event('acc-1', 'chat_message', T0 + 2 * MIN, { turn: 1 });
  f.event('acc-1', 'chat_message', T0 + 3 * MIN, { turn: 3 });
  // Old proxy: 2 single-shaped (analysis + one chat follow-up), 1 room-shaped.
  f.event('acc-1', 'ai_suggestion_shown', T0 + 4 * MIN, { category: 'Lamba', recommendation: 'tut' });
  f.event('acc-1', 'ai_suggestion_shown', T0 + 5 * MIN, { category: 'Lamba', recommendation: 'sat' });
  f.event('acc-1', 'ai_suggestion_shown', T0 + 6 * MIN, { items: [{ category: 'Masa', recommendation: 'tut' }] });
  // A room payload truncated at 2000 chars is not valid JSON and must not break the query.
  f.db.prepare("INSERT INTO events (device_id, event_type, payload_json, created_at) VALUES ('acc-1', 'ai_suggestion_shown', ?, ?)")
    .run('{"items":[{"category":"Ma', sqlTime(T0 + 7 * MIN));
  const s = byId(f.admin.listAccounts(), 'acc-1').summary;
  assert.equal(s.chatTurns, 2);
  assert.equal(s.roomScans.total, 1);
  assert.equal(s.singleAnalysesApprox, 2, 'room-shaped payloads are excluded; the rest stays labelled approximate');
});

test('Toparla counts by status, and feedback counts', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.toparla('acc-1', 'completed', T0);
  f.toparla('acc-1', 'completed', T0 + MIN);
  f.toparla('acc-1', 'failed', T0 + 2 * MIN);
  f.feedback('acc-1', 'Harika', T0 + 3 * MIN);
  const s = byId(f.admin.listAccounts(), 'acc-1').summary;
  assert.deepEqual(s.toparla, { total: 3, completed: 2, failed: 1, pending: 0 });
  assert.equal(s.feedback, 1);
});

// ---------------------------------------------------------------- timeline

test('account timeline is chronological: login first, product actions, last interaction, end', () => {
  const f = fixture(T0 + 3 * 60 * MIN);
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-1', subject: 'acc-1', created: T0 + 4 * MIN, last: T0 + 24 * MIN, reports: 30 });
  const room = f.room('acc-1', 'Salon', T0 + 6 * MIN);
  f.photo('acc-1', room, T0 + 7 * MIN);
  f.photo('acc-1', room, T0 + 7 * MIN + 20000);
  f.scan('acc-1', room, T0 + 9 * MIN, 'confirmed');
  f.event('acc-1', 'chat_message', T0 + 12 * MIN, { turn: 1 });
  f.decision('acc-1', 'tut', T0 + 18 * MIN, room);
  f.feedback('acc-1', 'Güzel', T0 + 21 * MIN);
  const detail = f.admin.getAccount('acc-1');
  const types = detail.timeline.map((i) => i.type);
  assert.deepEqual(types, ['login', 'room_created', 'room_photo', 'room_scan', 'chat_message', 'decision', 'feedback', 'last_interaction', 'session_end']);
  const ats = detail.timeline.map((i) => i.at);
  assert.deepEqual(ats, [...ats].sort((a, b) => a - b));
  assert.equal(detail.timeline[2].count, 2, 'consecutive photo uploads collapse into one line');
  assert.equal(detail.timeline.find((i) => i.type === 'decision').recommendation, 'tut');
  const end = detail.timeline.at(-1);
  assert.equal(end.detail, 'expired');
  assert.equal(end.computed, true, 'idle expiry is labelled as computed, not stored');
  assert.equal(end.at, T0 + 34 * MIN);
});

test('a row written in the same second as the login is still attributed to that session', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-1', subject: 'acc-1', created: T0 + 500 });
  f.room('acc-1', 'Salon', T0 + 500); // stored truncated to T0, i.e. "before" the login
  const detail = f.admin.getAccount('acc-1');
  assert.equal(detail.timeline[0].type, 'room_created');
  assert.equal(detail.timeline[0].attribution, 'exact', 'the 1-second storage precision is tolerated');
  assert.equal(detail.sessions[0].counts.rooms, 1);
});

test('pre-Session-V2 rows never crash the views and stay identifiable as legacy', () => {
  const f = fixture();
  f.account('acc-legacy', 'l@example.com', null, T0 - 50 * DAY);
  f.users('acc-legacy', T0 - 60 * DAY);
  f.room('acc-legacy', 'Eski oda', T0 - 55 * DAY);
  f.decision('acc-legacy', 'sat', T0 - 55 * DAY);
  f.room('legacy-guest-uuid', 'Eski misafir', T0 - 55 * DAY); // old guest_session cookie owner, no session row
  f.db.prepare("INSERT INTO rooms (device_id, name, created_at, updated_at) VALUES ('acc-legacy', 'Bozuk', 'not-a-date', 'not-a-date')").run();
  const row = byId(f.admin.listAccounts(), 'acc-legacy');
  assert.equal(row.preSessionV2Only, true);
  assert.equal(row.loginCount, 0);
  assert.equal(row.firstLoginAt, null);
  assert.equal(row.firstSeenAt, T0 - 60 * DAY);
  const detail = f.admin.getAccount('acc-legacy');
  assert.deepEqual(detail.sessions, []);
  assert.ok(detail.timeline.every((i) => i.attribution === 'outside'));
  assert.equal(detail.attributionTotals.outside, 2);
  assert.equal(f.admin.overview().preSessionV2Owners, 1);
  assert.equal(f.admin.getAccount('missing'), null);
});

test('account rows are attributed to sessions by time window; rows between sessions are outside', () => {
  const f = fixture(T0 + 5 * 60 * MIN);
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-morning', subject: 'acc-1', created: T0, last: T0 + 5 * MIN });              // window ends T0+15
  f.session({ id: 'sess-evening', subject: 'acc-1', created: T0 + 60 * MIN, last: T0 + 70 * MIN }); // window ends T0+80
  f.decision('acc-1', 'tut', T0 + 2 * MIN);
  f.decision('acc-1', 'sat', T0 + 65 * MIN);
  f.decision('acc-1', 'at', T0 + 66 * MIN);
  f.decision('acc-1', 'bagisla', T0 + 30 * MIN); // between the two sessions
  const detail = f.admin.getAccount('acc-1');
  const morning = detail.sessions.find((s) => s.idFull === 'sess-morning');
  const evening = detail.sessions.find((s) => s.idFull === 'sess-evening');
  assert.equal(morning.counts.decisions.total, 1);
  assert.equal(evening.counts.decisions.total, 2);
  assert.deepEqual(detail.attributionTotals, { exact: 3, ambiguous: 0, outside: 1 });
  // The Sessions table shows the same per-session numbers, not the lifetime total on every row.
  const listed = f.admin.listSessions({ kind: 'account' });
  assert.equal(listed.find((s) => s.idFull === 'sess-morning').counts.decisions.total, 1);
  assert.equal(listed.find((s) => s.idFull === 'sess-evening').counts.decisions.total, 2);
  assert.ok(listed.every((s) => s.attribution === 'time_window'));
});

test('overlapping account sessions (two devices) report ambiguity instead of a falsely precise session', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.session({ id: 'sess-phone', family: 'fam-phone', subject: 'acc-1', created: T0, last: T0 + 20 * MIN });
  f.session({ id: 'sess-laptop', family: 'fam-laptop', subject: 'acc-1', created: T0 + 10 * MIN, last: T0 + 25 * MIN });
  f.decision('acc-1', 'tut', T0 + 5 * MIN);  // only the phone was live
  f.decision('acc-1', 'sat', T0 + 15 * MIN); // both live
  const detail = f.admin.getAccount('acc-1');
  const phone = detail.sessions.find((s) => s.idFull === 'sess-phone');
  const laptop = detail.sessions.find((s) => s.idFull === 'sess-laptop');
  assert.equal(phone.counts.decisions.total, 1);
  assert.equal(laptop.counts.decisions.total, 0, 'the overlapping row is not assigned to either session');
  assert.equal(phone.ambiguousCount, 1);
  assert.equal(laptop.ambiguousCount, 1);
  assert.equal(phone.ambiguousCounts.decisions.total, 1, 'ambiguity is reported per metric');
  assert.equal(phone.ambiguousCounts.rooms, 0);
  const item = detail.timeline.find((i) => i.type === 'decision' && i.recommendation === 'sat');
  assert.equal(item.attribution, 'ambiguous');
  assert.equal(item.sessionShorts.length, 2);
  assert.equal(detail.account.summary.decisions.total, 2, 'the account-level total stays exact');
});

test('guest session counts are exact because a guest owner is exactly one session', () => {
  const f = fixture();
  f.session({ id: 'sess-g1', kind: 'guest', subject: 'guest-1', created: T0 });
  f.session({ id: 'sess-g2', kind: 'guest', subject: 'guest-2', created: T0 + MIN });
  f.room('guest-1', 'Oda', T0 + MIN);
  f.decision('guest-1', 'tut', T0 + 2 * MIN);
  const listed = f.admin.listSessions({ kind: 'guest' });
  const g1 = listed.find((s) => s.idFull === 'sess-g1');
  assert.equal(g1.attribution, 'exact');
  assert.equal(g1.counts.rooms, 1);
  assert.equal(g1.counts.decisions.total, 1);
  assert.equal(listed.find((s) => s.idFull === 'sess-g2').counts.rooms, 0);
  assert.equal(g1.maskedEmail, null);
});

test('conversion counts only an account session established right after a guest session in the same browser scope', () => {
  const f = fixture();
  f.account('acc-1', 'a@example.com');
  f.account('acc-2', 'b@example.com');
  f.session({ id: 'sess-g', kind: 'guest', family: 'fam-1', rev: 1, subject: 'guest-1', created: T0, ended: T0 + 3 * MIN, reason: 'replaced' });
  f.session({ id: 'sess-a', family: 'fam-1', rev: 2, subject: 'acc-1', created: T0 + 3 * MIN });
  f.session({ id: 'sess-b', family: 'fam-2', rev: 1, subject: 'acc-2', created: T0 + 4 * MIN });
  assert.equal(f.admin.overview().conversions, 1);
});

// ---------------------------------------------------------------- internal / test

test('internal/test sessions are excluded from default aggregates and lists, and can be included', () => {
  const f = fixture();
  f.account('acc-test', 't@example.com');
  f.session({ id: 'sess-t1', subject: 'acc-test', created: T0, internal: true });
  f.session({ id: 'sess-t2', subject: 'acc-test', created: T0 + MIN, internal: true });
  f.decision('acc-test', 'tut', T0 + 2 * MIN);
  f.account('acc-mixed', 'm@example.com');
  f.session({ id: 'sess-m1', subject: 'acc-mixed', created: T0, internal: true });
  f.session({ id: 'sess-m2', subject: 'acc-mixed', created: T0 + MIN });
  f.session({ id: 'sess-gi', kind: 'guest', subject: 'guest-internal', created: T0, internal: true });
  f.room('guest-internal', 'Test', T0 + MIN);
  f.session({ id: 'sess-ge', kind: 'guest', subject: 'guest-external', created: T0 });
  f.room('guest-external', 'Gerçek', T0 + MIN);

  assert.deepEqual(f.admin.listAccounts().map((a) => a.id), ['acc-mixed'], 'a fully-internal account is hidden; a mixed one stays');
  assert.deepEqual(f.admin.listAccounts({ testMode: 'only' }).map((a) => a.id), ['acc-test']);
  assert.equal(f.admin.listAccounts({ testMode: 'include' }).length, 2);

  const def = f.admin.overview();
  assert.equal(def.guestSessions, 1);
  assert.equal(def.totals.rooms, 1);
  assert.equal(def.totals.decisions.total, 0);
  assert.equal(def.activeAccounts, 1, 'only the mixed account has a non-internal session');
  const all = f.admin.overview({ testMode: 'include' });
  assert.equal(all.guestSessions, 2);
  assert.equal(all.totals.rooms, 2);
  assert.equal(all.totals.decisions.total, 1);
  assert.equal(all.activeAccounts, 2);

  assert.ok(f.admin.listSessions().every((s) => !s.internal));
  assert.ok(f.admin.listSessions({ testMode: 'only' }).every((s) => s.internal));
  assert.equal(f.admin.listSessions({ testMode: 'include' }).length, 6);
});

test('feedback and error lists apply the same internal/test rule and never return a stack', () => {
  const f = fixture();
  f.session({ id: 'sess-gi', kind: 'guest', subject: 'guest-internal', created: T0, internal: true });
  f.feedback('guest-internal', 'test notu', T0);
  f.feedback('guest-real', 'gerçek not', T0 + MIN);
  f.error('guest-internal', T0);
  f.error('guest-real', T0 + MIN);
  assert.deepEqual(f.admin.recentFeedback().map((x) => x.message), ['gerçek not']);
  assert.equal(f.admin.recentFeedback({ testMode: 'include' }).length, 2);
  const errors = f.admin.recentErrors({ testMode: 'include' });
  assert.equal(errors.length, 2);
  assert.ok(!JSON.stringify(errors).includes('SECRET-STACK'));
});

test('daily decisions are bucketed by Istanbul calendar day', () => {
  // 23:30 UTC on the 28th is already 02:30 on the 29th in Istanbul.
  const now = Date.UTC(2026, 8, 29, 12, 0, 0);
  const f = fixture(now);
  f.decision('owner', 'tut', Date.UTC(2026, 8, 28, 23, 30, 0));
  f.decision('owner', 'sat', Date.UTC(2026, 8, 28, 20, 0, 0));
  const days = Object.fromEntries(f.admin.overview().dailyDecisions.map((d) => [d.day, d.count]));
  assert.equal(days['2026-09-29'], 1);
  assert.equal(days['2026-09-28'], 1);
  assert.equal(Object.keys(days).length, 7);
});

// ---------------------------------------------------------------- time helpers

test('UTC storage values are converted to Europe/Istanbul for display, never sliced as local time', () => {
  assert.equal(adminTime.sqliteUtcToMs('2026-09-29 21:30:00'), Date.UTC(2026, 8, 29, 21, 30, 0));
  assert.equal(adminTime.sqliteUtcToMs('2026-09-29T21:30:00Z'), Date.UTC(2026, 8, 29, 21, 30, 0));
  assert.equal(adminTime.sqliteUtcToMs('garbage'), null);
  assert.equal(adminTime.sqliteUtcToMs(null), null);
  assert.equal(adminTime.formatIstanbul(Date.UTC(2026, 8, 29, 21, 30, 0)), '2026-09-30 00:30');
  assert.equal(adminTime.formatIstanbulTime(Date.UTC(2026, 8, 29, 18, 4, 0)), '21:04');
  assert.equal(adminTime.formatIstanbul(null), '—');
  assert.equal(adminTime.istanbulDayKey(Date.UTC(2026, 8, 29, 21, 30, 0)), '2026-09-30');
  assert.equal(adminTime.formatDuration(45000), '45 sn');
  assert.equal(adminTime.formatDuration(12 * MIN), '12 dk');
  assert.equal(adminTime.formatDuration(65 * MIN), '1 sa 05 dk');
  assert.equal(adminTime.maskEmail('ayse@example.com'), 'a***@example.com');
  assert.equal(adminTime.maskEmail(null), null);
});

test('parseTestMode defaults to excluding internal traffic', () => {
  assert.equal(adminActivity.parseTestMode(undefined), 'exclude');
  assert.equal(adminActivity.parseTestMode('include'), 'include');
  assert.equal(adminActivity.parseTestMode('only'), 'only');
  assert.equal(adminActivity.parseTestMode('drop table'), 'exclude');
});

// ---------------------------------------------------------------- privacy

test('privacy: activity queries never select or return content, file paths, stacks or credentials', () => {
  const f = fixture();
  f.account('acc-1', 'ayse@example.com', 'Ayşe');
  f.session({ id: 'sess-1', subject: 'acc-1', created: T0, last: T0 + 10 * MIN });
  f.session({ id: 'sess-g', kind: 'guest', subject: 'guest-1', created: T0 });
  for (const owner of ['acc-1', 'guest-1']) {
    const room = f.room(owner, 'Salon', T0 + MIN);
    f.photo(owner, room, T0 + 2 * MIN);
    f.scan(owner, room, T0 + 3 * MIN, 'confirmed');
    f.decision(owner, 'tut', T0 + 4 * MIN, room);
    f.chatPhoto(owner, T0 + 5 * MIN);
    f.event(owner, 'chat_message', T0 + 6 * MIN, { turn: 1, note: 'SECRET-PAYLOAD' });
    f.toparla(owner, 'failed', T0 + 7 * MIN);
    f.error(owner, T0 + 8 * MIN);
  }
  f.feedback('acc-1', 'FEEDBACK-TEXT-ALLOWED-IN-DETAIL', T0 + 9 * MIN);

  const outputs = JSON.stringify([
    f.admin.listAccounts({ testMode: 'include' }),
    f.admin.getAccount('acc-1'),
    f.admin.listSessions({ testMode: 'include' }),
    f.admin.overview({ testMode: 'include' }),
    f.admin.recentErrors({ testMode: 'include' }),
  ]);
  for (const secret of ['SECRET-ITEMS', 'SECRET-AI-REASONING', 'SECRET-CONVERSATION', 'SECRET-DECISION-REASONING',
    'SECRET-FILENAME', 'SECRET-CHAT-FILE', 'SECRET-TOPARLA-FILE', 'SECRET-PROVIDER-ERROR', 'SECRET-STACK',
    'SECRET-KEYHASH', 'SECRET-PAYLOAD']) {
    assert.ok(!outputs.includes(secret), `admin output leaked ${secret}`);
  }
  assert.ok(outputs.includes('FEEDBACK-TEXT-ALLOWED-IN-DETAIL'), 'feedback text is the intended exception');
  assert.ok(!JSON.stringify(f.admin.listAccounts()).includes('ayse@example.com'), 'list rows carry only the masked email');
  assert.ok(!JSON.stringify(f.admin.listSessions()).includes('ayse@example.com'), 'session rows carry only the masked email');
  assert.equal(f.admin.getAccount('acc-1').account.email, 'ayse@example.com', 'the full email is available on the detail page');

  // Statement-level check: content columns are never selected, and the few
  // content-bearing columns that are referenced appear only in NULL checks.
  const sqlText = f.captured.join('\n');
  for (const column of ['items_json', 'messages_json', 'suggestions_json', 'draft_items_json', 'photo_ids_json',
    'reasoning', 'stack', 'filename', 'error_message', 'creation_key_hash', 'login_intent_hash', 'image']) {
    assert.ok(!new RegExp(`\\b${column}\\b`).test(sqlText), `admin SQL references ${column}`);
  }
  assert.ok(!/\b(final_items_json|confirmation_json)\b(?!\s+IS\s+(NOT\s+)?NULL)/.test(sqlText), 'analysis JSON only in NULL checks');
  assert.ok(!/payload_json(?!\s+(IS NULL|NOT LIKE))/.test(sqlText), 'event payloads are never selected');
});
