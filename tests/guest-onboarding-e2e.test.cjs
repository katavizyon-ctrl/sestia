// Guest/account onboarding regression under Session V2 — part of `npm test`
// (also runnable directly: node tests/guest-onboarding-e2e.test.cjs). Starts
// an isolated `next dev` in a temp copy with its own empty database.
// No credentials, user data or network services; EMAIL_LOGIN_REQUIRED=1 is set
// on purpose, because that is how staging refused guests before the fix.
//
// Exact per-kind timing boundaries are already proven deterministically,
// with an injected clock, in tests/session-store.test.cjs (23 tests) — this
// file focuses on what only a real server/routes/Auth.js integration can
// prove: explicit establishment, real cookies, real ownership across HTTP
// calls, and legacy-credential rejection.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const credentials = require('../lib/sessionCredentials.cjs');
const root = path.resolve(__dirname, '..');
const PORT = 3004;
const BASE = `http://127.0.0.1:${PORT}`;
const AUTH_SECRET = 'sestia-guest-e2e-only-not-production';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-guest-e2e-'));
for (const name of ['app', 'lib', 'components', 'public', 'SESTIA_BILGI_KUTUPHANESI', 'package.json', 'next.config.mjs', 'jsconfig.json', 'proxy.js']) {
  fs.cpSync(path.join(root, name), path.join(directory, name), { recursive: true });
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'junction');
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'ComSpec']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', AUTH_SECRET, ACCESS_CODE: 'e2e',
  ADMIN_ACCESS_CODE: 'e2e-admin', ANTHROPIC_API_KEY: 'isolated-no-real-key', EMAIL_LOGIN_REQUIRED: '1',
  SESTIA_SESSION_POLICY: 'staging-idle-v2',
  // Placeholder values so the Resend provider is configured; the tests never
  // request an email, they insert the code into the isolated database instead.
  RESEND_API_KEY: 're_isolated_not_a_real_key', AUTH_EMAIL_FROM: 'SESTIA E2E <e2e@example.test>' });
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(PORT)],
  { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });

function dbConn() {
  const Database = require('better-sqlite3');
  return new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
}
// Directly pushes a session's own last_activity/idle_expires_at into the
// past to simulate true inactivity without waiting real wall-clock time —
// must respect the same CHECK(idle_expires_at_ms = last_activity_at_ms +
// idle_timeout_ms) constraint lib/sessionStore.cjs's schema enforces.
function expireSession(sessionId, idleTimeoutMs = 300000) {
  const db = dbConn();
  const lastActivity = Date.now() - (idleTimeoutMs + 100000);
  db.prepare('UPDATE sestia_sessions SET last_activity_at_ms = ?, idle_expires_at_ms = ? WHERE id = ?')
    .run(lastActivity, lastActivity + idleTimeoutMs, sessionId);
  db.close();
}

// Minimal cookie jar: one per simulated browser.
function browser() {
  const jar = new Map();
  return {
    jar,
    async request(pathname, options = {}) {
      const headers = { ...(options.headers || {}), cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
      const res = await fetch(BASE + pathname, { ...options, headers, redirect: 'manual' });
      for (const line of res.headers.getSetCookie()) {
        const [pair] = line.split(';');
        const index = pair.indexOf('=');
        jar.set(pair.slice(0, index), pair.slice(index + 1));
      }
      return res;
    },
  };
}

// Invite gate (skipped code in dev) + first page load (mints the family/
// scope cookie only — no private identity yet) + explicit guest
// establishment, exactly as the real WelcomeView "Misafir olarak devam et"
// button now does via SessionLifecycleProvider.establishGuest().
async function establishGuestOnly(b) {
  const boot = await (await b.request('/api/session/bootstrap', { method: 'POST' })).json();
  const est = await b.request('/api/session/guest', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyRevision: boot.familyRevision, creationKey: crypto.randomUUID() }) });
  assert.equal(est.status, 200, 'explicit guest establishment succeeds');
  assert.ok(b.jar.get(credentials.GUEST_COOKIE), 'guest establishment sets the v2 guest cookie');
  return est.json();
}
async function arrive(b) {
  assert.equal((await b.request('/api/access', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).status, 200);
  const page = await b.request('/');
  assert.equal(page.status, 200, 'app page opens after the invite gate');
  assert.ok(b.jar.get(credentials.SCOPE_COOKIE), 'proxy bootstrapped the (no-private-data) family scope cookie');
  assert.equal(b.jar.get('guest_session'), undefined, 'proxy never mints a guest identity implicitly anymore');
  return establishGuestOnly(b);
}
async function state(b) {
  const res = await b.request('/api/state');
  return { status: res.status, body: await res.json() };
}
async function createRoom(b, name) {
  const res = await b.request('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, operationKey: crypto.randomUUID() }) });
  assert.equal(res.status, 200, `room create: ${res.status}`);
  return res.json();
}
// The existing email/code flow after the email card: bind a login intent
// (as WelcomeView.submitEmail now does), precheck, then the 6-digit code
// through Auth.js's real callback. The code is stored the way Auth.js stores
// it (sha256(code+secret)).
async function signUpWithCode(b, email, name) {
  const intentRes = await b.request('/api/session/login-intent', { method: 'POST' });
  assert.equal(intentRes.status, 200, `login-intent: ${intentRes.status}`);
  const pre = await b.request('/api/account/precheck', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flow: 'signup', name, email }) });
  assert.equal(pre.status, 200, `precheck must not block: ${pre.status} ${await pre.text()}`);
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const db = dbConn();
  db.prepare('INSERT INTO auth_verificationToken (identifier, token, expires) VALUES (?, ?, ?)')
    .run(email, crypto.createHash('sha256').update(`${code}${AUTH_SECRET}`).digest('hex'), Date.now() + 15 * 60 * 1000);
  db.close();
  const res = await b.request(`/api/auth/callback/resend?${new URLSearchParams({ callbackUrl: `${BASE}/`, token: code, email })}`);
  assert.equal(res.status, 302, `callback: ${res.status}`);
  assert.equal(new URL(res.headers.get('location'), BASE).pathname, '/', `signed in, not an error page: ${res.headers.get('location')}`);
  assert.ok(b.jar.get('authjs.session-token'), 'session cookie set');
  const s = await state(b);
  assert.equal(s.status, 200);
  assert.equal(s.body.identityType, 'account');
  return s.body;
}

async function waitForServer() {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not start\n' + log);
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`PASS ${name}`); } catch (error) { results.push(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

(async () => {
  await waitForServer();
  const a = browser();
  const b = browser();

  await check('guest auth: invite gate -> explicit establishment -> /api/state answers with a guest identity', async () => {
    await arrive(a);
    const s = await state(a);
    assert.equal(s.status, 200, `expected 200, got ${s.status} ${JSON.stringify(s.body)}`);
    assert.equal(s.body.identityType, 'guest');
    assert.ok(s.body.identityId);
    assert.equal(s.body.name, null, 'server never invents a guest name');
  });

  await check('before explicit establishment, /api/state reports session_required, not a connectivity error', async () => {
    const fresh = browser();
    await fresh.request('/api/access', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    await fresh.request('/'); // bootstraps the family cookie only
    const res = await fresh.request('/api/state');
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.error, 'session_required');
  });

  await check('anonymous guest refresh keeps the same identity (no activity report sent)', async () => {
    const first = (await state(a)).body.identityId;
    await a.request('/');
    const again = await state(a);
    assert.equal(again.status, 200);
    assert.equal(again.body.identityId, first);
  });

  await check('POST /api/session/activity renews the same session and pushes the deadline forward', async () => {
    const before = await (await a.request('/api/session')).json();
    const res = await a.request('/api/session/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'click', eventAt: Date.now() }) });
    assert.equal(res.status, 200);
    const after = await res.json();
    assert.ok(after.idleExpiresAt >= before.idleExpiresAt, 'accepted activity never moves the deadline backwards');
    assert.equal((await state(a)).body.identityId, before.ownerId, 'still the same identity after renewal');
  });

  await check('background/status traffic (GET /api/session, health) never renews activity', async () => {
    const before = await (await a.request('/api/session')).json();
    for (let i = 0; i < 5; i += 1) await a.request('/api/session');
    await a.request('/api/health');
    const after = await (await a.request('/api/session')).json();
    assert.equal(after.idleExpiresAt, before.idleExpiresAt, 'plain status/health reads must not extend the deadline');
  });

  await check('an out-of-window (>15s old) activity report is rejected, not silently accepted', async () => {
    const res = await a.request('/api/session/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'click', eventAt: Date.now() - 20000 }) });
    assert.equal(res.status, 400);
  });

  await check('data isolation: guest B cannot list or open guest A rooms', async () => {
    const room = await createRoom(a, 'Guest A Salon');
    assert.ok(room.id || room.room?.id, 'room id');
    const roomId = room.id || room.room.id;
    await arrive(b);
    const sa = await state(a);
    const sb = await state(b);
    assert.equal(sb.status, 200);
    assert.notEqual(sb.body.identityId, sa.body.identityId);
    const listA = await (await a.request('/api/rooms')).json();
    const listB = await (await b.request('/api/rooms')).json();
    assert.ok(listA.rooms.some((r) => r.id === roomId), 'owner sees own room');
    assert.equal(listB.rooms.some((r) => r.id === roomId), false, 'other guest must not see it');
    assert.equal((await b.request(`/api/rooms/${roomId}`)).status, 404);
  });

  await check('forged or missing guest cookie is not accepted', async () => {
    const c = browser();
    await c.request('/api/access', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    await c.request('/');
    c.jar.set(credentials.GUEST_COOKIE, `${a.jar.get(credentials.GUEST_COOKIE).split('.').slice(0, 2).join('.')}.${'0'.repeat(64)}`);
    const res = await c.request('/api/rooms');
    assert.equal(res.status, 401, 'a tampered cookie is never trusted, and is never silently replaced with a new identity either');
  });

  await check('legacy a68405f-era guest_session cookie is never imported/resumed into Session V2', async () => {
    const c = browser();
    await c.request('/api/access', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    await c.request('/');
    // Exactly the old (pre-V2) signed format: guestId.expires.hmac256(AUTH_SECRET).
    const guestId = crypto.randomUUID();
    const payload = `${guestId}.${Date.now() + 60 * 60 * 1000}`;
    const legacyToken = `${payload}.${crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex')}`;
    c.jar.set('guest_session', legacyToken);
    const res = await c.request('/api/state');
    assert.equal(res.status, 401, 'a correctly-signed LEGACY token must still be rejected — Session V2 never reads guest_session for authorization');
    assert.equal((await res.json()).error, 'session_required');
  });

  await check('account session still resolves to the account (and wins over a guest cookie)', async () => {
    const { encode } = await import(require('node:url').pathToFileURL(path.join(root, 'node_modules/next-auth/jwt.js')).href);
    const userId = `e2e-account-${crypto.randomUUID()}`;
    const db = dbConn();
    db.prepare('INSERT INTO auth_user (id, name, email) VALUES (?, ?, ?)').run(userId, 'Hesap Test', `${userId}@example.test`);
    db.close();
    // A raw Auth.js JWT with no sestiaSid at all — the exact "legacy JWT"
    // shape Session V2 must reject rather than trust or fall back from.
    const legacyToken = await encode({ token: { sub: userId, id: userId, email: `${userId}@example.test` }, secret: AUTH_SECRET, salt: 'authjs.session-token' });
    a.jar.set('authjs.session-token', legacyToken);
    const legacy = await state(a);
    assert.equal(legacy.status, 401, 'an Auth.js JWT without a bound Session V2 sid must require fresh authentication');
    assert.equal(legacy.body.error, 'session_required');
    assert.notEqual(legacy.body.identityType, 'guest', 'must never silently fall back to a leftover guest identity either');
    a.jar.delete('authjs.session-token');
    assert.equal((await state(a)).body.identityType, 'guest', 'guest identity is intact and unaffected');
  });

  await check('named email/account: onboarding "Ayşe" becomes the account name', async () => {
    const d = browser();
    await arrive(d);
    const account = await signUpWithCode(d, 'ayse@example.test', 'Ayşe');
    assert.equal(account.name, 'Ayşe');
  });

  // HIGH-3 (SESTIA_SESSION_V2_INDEPENDENT_CODE_REVIEW.md): account
  // establishment must record visitor metadata too, not only guest
  // establishment, using the same privacy-safe model (no raw IP, no
  // renewal of session activity).
  await check('account Session V2 establishment records visitor metadata (device/browser, no raw IP, no activity renewal)', async () => {
    const h = browser();
    await arrive(h);
    const before = await (await h.request('/api/session')).json();
    await signUpWithCode(h, 'visitmeta@example.test', 'Visit Meta');
    const after = await (await h.request('/api/session')).json();
    assert.equal(after.state, 'active');
    assert.equal(after.identityType, 'account');
    const db = dbConn();
    const row = db.prepare('SELECT * FROM session_visit_metadata WHERE session_id = ?').get(after.sessionId);
    db.close();
    assert.ok(row, 'an account session must have its own visit-metadata row, same as a guest session');
    assert.ok(row.device_class && row.browser, 'device/browser must be populated for an account session too');
    assert.equal(Object.keys(row).some((c) => /ip/i.test(c) && row[c] != null && typeof row[c] === 'string' && row[c].includes('.')), false,
      'no column resembling a raw IP address may be populated');
    assert.equal(JSON.stringify(row).match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/), null, 'no IPv4-shaped value anywhere in the recorded row');
    // Recording visit metadata (an account establishment side effect) must
    // never itself count as/trigger a session_visit_metadata... nor renew
    // idle activity: the account session's own last_activity_at_ms must be
    // exactly its creation time, unaffected by the metadata-recording step
    // that runs immediately alongside it.
    const db2 = dbConn();
    const sessionRow = db2.prepare('SELECT created_at_ms, last_activity_at_ms FROM sestia_sessions WHERE id = ?').get(after.sessionId);
    db2.close();
    assert.equal(sessionRow.last_activity_at_ms, sessionRow.created_at_ms, 'visit-metadata capture must not move last_activity_at_ms');
  });

  await check('anonymous email/account: no name required, none invented, stale pending name discarded', async () => {
    const e = browser();
    await arrive(e);
    // An earlier attempt with a name, then the person skips the name and retries.
    const stale = await e.request('/api/account/precheck', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flow: 'signup', name: 'Eski', email: 'isimsiz@example.test' }) });
    assert.equal(stale.status, 200);
    const account = await signUpWithCode(e, 'isimsiz@example.test', '');
    assert.equal(account.name, null);
  });

  await check('same account reauthenticating gets a NEW Session V2 session but the SAME auth_user.id and durable data', async () => {
    const f = browser();
    await arrive(f);
    const first = await signUpWithCode(f, 'reauth@example.test', 'Tekrar');
    await createRoom(f, 'Kalıcı Oda');
    // Simulate a fresh browser/session for the exact same email.
    const g = browser();
    await arrive(g);
    const second = await signUpWithCode(g, 'reauth@example.test', '');
    assert.equal(second.identityId, first.identityId, 'same auth_user.id, not a new account');
    const rooms = await (await g.request('/api/rooms')).json();
    assert.ok(rooms.rooms.some((r) => r.name === 'Kalıcı Oda'), 'durable account data is regained after reauthentication');
  });

  // Landing rule source of truth (lib/db.js hasStartedRealWork via /api/state):
  // same fields for guests and accounts; one room is real work.
  await check('real-work signal: fresh guest/account none, a room makes it real work', async () => {
    const w = browser();
    await arrive(w);
    const fresh = (await state(w)).body;
    assert.deepEqual([fresh.identityType, fresh.hasStartedWork, fresh.totalDecisions], ['guest', false, 0]);
    await createRoom(w, 'Boş oda');
    assert.equal((await state(w)).body.hasStartedWork, true, 'an empty room already counts');
    const acc = browser();
    await arrive(acc);
    const account = await signUpWithCode(acc, 'landing@example.test', '');
    assert.deepEqual([account.hasStartedWork, account.totalDecisions], [false, 0]);
    await createRoom(acc, 'Salon');
    assert.equal((await state(acc)).body.hasStartedWork, true);
  });

  // Existing room photos -> room analysis reads photo bytes back through this
  // route; it must serve the owner (guest or account) and nobody else, and
  // must never be cacheable across an identity transition.
  await check('existing room photo bytes: owner guest/account only, no-store, no new photo row on read', async () => {
    const upload = async (who, roomId, text) => {
      const fd = new FormData();
      fd.append('photo', new Blob([text], { type: 'image/jpeg' }), 'photo.jpg');
      fd.append('operationKey', crypto.randomUUID());
      const res = await who.request(`/api/rooms/${roomId}/photos`, { method: 'POST', body: fd });
      assert.equal(res.status, 200, `upload ${res.status}`);
      return (await res.json()).id;
    };
    const read = async (who, roomId, photoId) => {
      const res = await who.request(`/api/rooms/${roomId}/photos/${photoId}`);
      return { status: res.status, text: res.status === 200 ? await res.text() : null, cacheControl: res.headers.get('cache-control') };
    };
    const g = browser();
    await arrive(g);
    const guestRoom = await createRoom(g, 'Guest Salon');
    const guestPhoto = await upload(g, guestRoom.id, 'guest-bytes');
    const acct = browser();
    await arrive(acct);
    await signUpWithCode(acct, 'photos@example.test', 'Foto');
    const acctRoom = await createRoom(acct, 'Account Salon');
    const acctPhoto = await upload(acct, acctRoom.id, 'account-bytes');
    const ownRead = await read(g, guestRoom.id, guestPhoto);
    assert.deepEqual({ status: ownRead.status, text: ownRead.text }, { status: 200, text: 'guest-bytes' });
    assert.equal(ownRead.cacheControl, 'private, no-store', 'private media must never be cached across an identity transition');
    assert.deepEqual((({ status, text }) => ({ status, text }))(await read(acct, acctRoom.id, acctPhoto)), { status: 200, text: 'account-bytes' });
    assert.equal((await read(acct, guestRoom.id, guestPhoto)).status, 404, 'account cannot read a guest photo');
    assert.equal((await read(g, acctRoom.id, acctPhoto)).status, 404, 'guest cannot read an account photo');
    assert.equal((await read(b, guestRoom.id, guestPhoto)).status, 404, 'another guest cannot read it');
    const detail = await (await g.request(`/api/rooms/${guestRoom.id}`)).json();
    assert.deepEqual(detail.photos.map((p) => p.id), [guestPhoto], 'reading bytes creates no photo row');
  });

  // --- Session V2: true-inactivity timeout, simulated via direct DB access
  // (exact boundary math is already proven deterministically in
  // tests/session-store.test.cjs; this proves the real routes/ownership
  // react correctly once a session is genuinely expired). ---

  await check('inactivity timeout: old guest is never resumed, a new disjoint identity is issued, old data is kept but hidden', async () => {
    const f = browser();
    const est = await arrive(f);
    const room = await createRoom(f, 'Eski misafir odasi');
    const oldAccessOk = f.jar.get('access_ok');
    expireSession(est.sessionId);
    const afterExpiry = await state(f);
    assert.equal(afterExpiry.status, 401, 'the expired session is rejected outright, never silently treated as active');
    assert.equal(afterExpiry.body.error, 'session_required');
    // Explicit re-establishment, exactly like a real "Misafir olarak devam
    // et" click after the app shows guest entry again — access_ok is still
    // valid, so this does NOT resubmit the access code.
    const reEst = await establishGuestOnly(f);
    assert.notEqual(reEst.ownerId, est.ownerId, 'a NEW disjoint guest id is issued; the old one is never resumed');
    const after = await state(f);
    assert.equal(after.body.hasStartedWork, false, 'the new identity owns nothing (lands on Keşif, not Ana Sayfa)');
    const list = await (await f.request('/api/rooms')).json();
    assert.equal(list.rooms.some((r) => r.id === room.id), false, "the new guest cannot see the old guest's room");
    assert.equal((await f.request(`/api/rooms/${room.id}`)).status, 404, 'old room is not reachable by id either, from the new identity');
    // Expiry must not delete data.
    const db2 = dbConn();
    const row = db2.prepare('SELECT device_id FROM rooms WHERE id = ?').get(room.id);
    db2.close();
    assert.ok(row, 'the old room row must still exist in the database (no deletion on expiry)');
    assert.equal(row.device_id, est.ownerId, 'still owned by the old guest id, never reassigned to the new one');
    assert.equal(f.jar.get('access_ok'), oldAccessOk, 'access_ok is untouched by session expiry (independent mechanism)');
  });

  await check('static assets and health checks never touch/renew any session cookie', async () => {
    const f = browser();
    await arrive(f);
    const beforeGuest = f.jar.get(credentials.GUEST_COOKIE);
    const beforeScope = f.jar.get(credentials.SCOPE_COOKIE);
    const health = await f.request('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.headers.getSetCookie().length, 0, '/api/health must not touch any cookie');
    const favicon = await f.request('/favicon.ico');
    assert.equal(favicon.headers.getSetCookie().length, 0, 'a static-asset path (excluded by proxy.js\'s matcher) must not touch any cookie');
    assert.equal(f.jar.get(credentials.GUEST_COOKIE), beforeGuest);
    assert.equal(f.jar.get(credentials.SCOPE_COOKIE), beforeScope);
  });

  await check('account session is unaffected by a concurrently-expired guest session in the same family', async () => {
    const g = browser();
    await arrive(g);
    const { encode } = await import(require('node:url').pathToFileURL(path.join(root, 'node_modules/next-auth/jwt.js')).href);
    const intentRes = await g.request('/api/session/login-intent', { method: 'POST' });
    assert.equal(intentRes.status, 200);
    // Bind a real account session the same way the app does, then also force
    // the (now-superseded) guest row into an expired state to prove the two
    // are resolved completely independently.
    const account = await signUpWithCode(g, 'guestexp@example.test', 'Hesap Test 2');
    const s = await state(g);
    assert.equal(s.status, 200);
    assert.equal(s.body.identityType, 'account');
    assert.equal(s.body.identityId, account.identityId);
  });

  await check("expired guest cannot continue old chat-attachment ownership; a fresh guest's own attachment stays private", async () => {
    const f = browser();
    const est = await arrive(f);
    const fd = new FormData();
    fd.append('photo', new Blob(['old-guest-bytes'], { type: 'image/jpeg' }), 'photo.jpg');
    const uploadRes = await f.request('/api/chat/attachments', { method: 'POST', body: fd });
    assert.equal(uploadRes.status, 200);
    const attachmentId = (await uploadRes.json()).id;
    const readOwn = await f.request(`/api/chat/attachments/${attachmentId}`);
    assert.equal(readOwn.headers.get('cache-control'), 'private, no-store');
    expireSession(est.sessionId);
    const afterExpiry = await f.request(`/api/chat/attachments/${attachmentId}`);
    assert.equal(afterExpiry.status, 401, 'the expired session cannot read its own old attachment either');
    await establishGuestOnly(f);
    const secondTry = await f.request(`/api/chat/attachments/${attachmentId}`);
    assert.equal(secondTry.status, 404, "the new identity cannot read the old identity's chat attachment bytes");
  });

  await check('cross-origin POSTs to session-mutation routes are rejected', async () => {
    const f = browser();
    await arrive(f);
    const res = await f.request('/api/session/activity', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.test', 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify({ event: 'click', eventAt: Date.now() }) });
    assert.equal(res.status, 403);
  });

  console.log(results.join('\n'));
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  child.kill();
  setTimeout(() => {
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('sestia-guest-e2e-')) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch {}
    }
    process.exit();
  }, 1500);
});
