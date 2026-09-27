// Guest onboarding regression — part of `npm test` (also runnable directly:
// node tests/guest-onboarding-e2e.test.cjs). Starts an isolated `next dev` in
// a temp copy with its own empty database.
// No credentials, user data or network services; EMAIL_LOGIN_REQUIRED=1 is set
// on purpose, because that is how staging refused guests before the fix.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
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
  // Placeholder values so the Resend provider is configured; the tests never
  // request an email, they insert the code into the isolated database instead.
  RESEND_API_KEY: 're_isolated_not_a_real_key', AUTH_EMAIL_FROM: 'SESTIA E2E <e2e@example.test>' });
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(PORT)],
  { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });

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
// Invite gate (skipped code in dev) + first page load, like a real visit; the
// page load is where proxy.js mints the signed guest cookie.
async function arrive(b) {
  assert.equal((await b.request('/api/access', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).status, 200);
  const page = await b.request('/');
  assert.equal(page.status, 200, 'app page opens after the invite gate');
  assert.ok(b.jar.get('guest_session'), 'proxy minted a guest cookie');
}
// Hand-crafts a correctly-signed guest_session value for an arbitrary
// (guestId, expires) pair, exactly the way lib/guestToken.js signs its own
// tokens. Lets the 1-hour rolling-inactivity boundary be tested deterministically
// — "already renewed 1 minute ago" or "expired 1 second ago" — without ever
// waiting real wall-clock time.
function signGuestToken(guestId, expiresMs) {
  const payload = `${guestId}.${expiresMs}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
function guestTokenExpiry(cookieValue) {
  return Number(cookieValue.split('.')[1]);
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
// The existing email/code flow after the email card: precheck with the
// onboarding name (or none), then the 6-digit code through Auth.js's real
// callback. The code is stored the way Auth.js stores it (sha256(code+secret)).
async function signUpWithCode(b, email, name) {
  const pre = await b.request('/api/account/precheck', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flow: 'signup', name, email }) });
  assert.equal(pre.status, 200, `precheck must not block: ${pre.status} ${await pre.text()}`);
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const Database = require('better-sqlite3');
  const db = new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
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

  await check('guest auth: invite gate -> app -> /api/state answers with a guest identity', async () => {
    await arrive(a);
    const s = await state(a);
    assert.equal(s.status, 200, `expected 200, got ${s.status} ${JSON.stringify(s.body)}`);
    assert.equal(s.body.identityType, 'guest');
    assert.ok(s.body.identityId);
    assert.equal(s.body.name, null, 'server never invents a guest name');
  });

  await check('anonymous guest refresh keeps the same identity', async () => {
    const first = (await state(a)).body.identityId;
    await a.request('/');
    const again = await state(a);
    assert.equal(again.status, 200);
    assert.equal(again.body.identityId, first);
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
    c.jar.set('guest_session', `${a.jar.get('guest_session').split('.').slice(0, 2).join('.')}.forged`);
    const res = await c.request('/api/rooms');
    assert.equal(res.status, 401, 'a tampered cookie is replaced, never trusted');
  });

  await check('account session still resolves to the account (and wins over a guest cookie)', async () => {
    const { encode } = await import(require('node:url').pathToFileURL(path.join(root, 'node_modules/next-auth/jwt.js')).href);
    const userId = `e2e-account-${crypto.randomUUID()}`;
    const Database = require('better-sqlite3');
    const db = new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
    db.prepare('INSERT INTO auth_user (id, name, email) VALUES (?, ?, ?)').run(userId, 'Hesap Test', `${userId}@example.test`);
    db.close();
    const token = await encode({ token: { sub: userId, id: userId, email: `${userId}@example.test` }, secret: AUTH_SECRET, salt: 'authjs.session-token' });
    a.jar.set('authjs.session-token', token);
    const s = await state(a);
    assert.equal(s.status, 200);
    assert.equal(s.body.identityType, 'account');
    assert.equal(s.body.identityId, userId);
    assert.equal(s.body.name, 'Hesap Test');
    const rooms = await (await a.request('/api/rooms')).json();
    assert.equal(rooms.rooms.length, 0, 'guest rooms are not silently merged into the account');
    a.jar.delete('authjs.session-token');
    assert.equal((await state(a)).body.identityType, 'guest', 'guest identity is intact after the account signs out');
  });

  await check('named email/account: onboarding "Ayşe" becomes the account name', async () => {
    const d = browser();
    await arrive(d);
    const account = await signUpWithCode(d, 'ayse@example.test', 'Ayşe');
    assert.equal(account.name, 'Ayşe');
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
  // route; it must serve the owner (guest or account) and nobody else.
  await check('existing room photo bytes: owner guest/account only, no new photo row on read', async () => {
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
      return { status: res.status, text: res.status === 200 ? await res.text() : null };
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
    assert.deepEqual(await read(g, guestRoom.id, guestPhoto), { status: 200, text: 'guest-bytes' });
    assert.deepEqual(await read(acct, acctRoom.id, acctPhoto), { status: 200, text: 'account-bytes' });
    assert.equal((await read(acct, guestRoom.id, guestPhoto)).status, 404, 'account cannot read a guest photo');
    assert.equal((await read(g, acctRoom.id, acctPhoto)).status, 404, 'guest cannot read an account photo');
    assert.equal((await read(b, guestRoom.id, guestPhoto)).status, 404, 'another guest cannot read it');
    const detail = await (await g.request(`/api/rooms/${guestRoom.id}`)).json();
    assert.deepEqual(detail.photos.map((p) => p.id), [guestPhoto], 'reading bytes creates no photo row');
  });

  // --- Guest session 1-hour inactivity timeout (rolling renewal) ---

  await check('rolling renewal: activity just before the boundary keeps the same identity and pushes expiry back out to ~1h', async () => {
    const f = browser();
    await arrive(f);
    const guestId = f.jar.get('guest_session').split('.')[0];
    // Simulate "renewed a while ago, 1 minute of validity left" without waiting.
    f.jar.set('guest_session', signGuestToken(guestId, Date.now() + 60 * 1000));
    const s = await state(f);
    assert.equal(s.status, 200);
    assert.equal(s.body.identityId, guestId, 'still the same guest while inside the window');
    const renewedExpiry = guestTokenExpiry(f.jar.get('guest_session'));
    assert.ok(renewedExpiry > Date.now() + 55 * 60 * 1000, 'the response must push expiry back out to ~1h, not leave the short one in place');
  });

  await check('inactivity beyond 1h: old guest is never resumed, a new disjoint identity is issued, old data is kept but hidden', async () => {
    const f = browser();
    await arrive(f);
    const oldGuestId = f.jar.get('guest_session').split('.')[0];
    const room = await createRoom(f, 'Eski misafir odasi');
    const oldAccessOk = f.jar.get('access_ok');
    // Simulate ">1h of inactivity" without waiting: a correctly-signed but
    // already-expired token for the SAME guest.
    f.jar.set('guest_session', signGuestToken(oldGuestId, Date.now() - 1000));
    const page = await f.request('/');
    assert.equal(page.status, 200, 'access-code authorization alone still lets the request into the app');
    assert.equal(f.jar.get('access_ok'), oldAccessOk, 'access_ok is untouched by guest expiry (independent mechanism)');
    const after = await state(f);
    assert.equal(after.status, 200);
    assert.notEqual(after.body.identityId, oldGuestId, 'a NEW guest id is issued; the old one is never resumed');
    assert.equal(after.body.hasStartedWork, false, 'the new identity owns nothing (lands on Keşif, not Ana Sayfa)');
    const list = await (await f.request('/api/rooms')).json();
    assert.equal(list.rooms.some((r) => r.id === room.id), false, "the new guest cannot see the old guest's room");
    assert.equal((await f.request(`/api/rooms/${room.id}`)).status, 404, 'old room is not reachable by id either, from the new identity');
    // Expiry must not delete data — the row still exists, still owned by the
    // old (now-unreachable) guest id, never reassigned to the new one.
    const Database = require('better-sqlite3');
    const db = new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
    const row = db.prepare('SELECT device_id FROM rooms WHERE id = ?').get(room.id);
    db.close();
    assert.ok(row, 'the old room row must still exist in the database (no deletion on expiry)');
    assert.equal(row.device_id, oldGuestId, 'still owned by the old guest id, never reassigned to the new one');
  });

  await check('same-request cookie propagation: an expired cookie sent straight to an API route is never treated as an active identity in that same response', async () => {
    const f = browser();
    await arrive(f);
    const oldGuestId = f.jar.get('guest_session').split('.')[0];
    await createRoom(f, 'Az once aktifti');
    f.jar.set('guest_session', signGuestToken(oldGuestId, Date.now() - 1000));
    // No intervening page load — the very first post-expiry request goes
    // straight to an API route, like a message sent from an already-open tab.
    const res = await f.request('/api/rooms');
    if (res.status === 401) {
      results.push("INFO same-request propagation: proxy's renewed Set-Cookie does not reach getIdentity() within the same request -> clean 401 (matches Next.js docs: a response's Set-Cookie is not forwarded into the downstream request's Cookie header for that same request)");
    } else {
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.rooms.length, 0, "if accepted in the same request, it must be as a brand-new, empty-owning guest, never the old identity's data");
      results.push('INFO same-request propagation: the request was accepted as a fresh, disjoint, empty-owning guest (also safe: no old-identity data was reachable)');
    }
    assert.ok(f.jar.get('guest_session'), 'a cookie (renewed or freshly minted) is present in the response either way');
    assert.notEqual(f.jar.get('guest_session').split('.')[0], oldGuestId, 'whichever outcome occurred, it is never the expired identity');
  });

  await check('static assets and health checks never renew or reissue the guest cookie', async () => {
    const f = browser();
    await arrive(f);
    const before = f.jar.get('guest_session');
    const health = await f.request('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.headers.getSetCookie().some((c) => c.startsWith('guest_session=')), false, '/api/health must not renew the guest cookie');
    const favicon = await f.request('/favicon.ico');
    assert.equal(favicon.headers.getSetCookie().some((c) => c.startsWith('guest_session=')), false, 'a static-asset path (excluded by proxy.js\'s matcher) must not renew the guest cookie');
    assert.equal(f.jar.get('guest_session'), before, 'guest identity/expiry unchanged by non-qualifying traffic');
  });

  await check('account session is unaffected even when the guest cookie is simultaneously expired', async () => {
    const g = browser();
    await arrive(g);
    const { encode } = await import(require('node:url').pathToFileURL(path.join(root, 'node_modules/next-auth/jwt.js')).href);
    const userId = `e2e-account-guestexp-${crypto.randomUUID()}`;
    const Database = require('better-sqlite3');
    const db = new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
    db.prepare('INSERT INTO auth_user (id, name, email) VALUES (?, ?, ?)').run(userId, 'Hesap Test 2', `${userId}@example.test`);
    db.close();
    const token = await encode({ token: { sub: userId, id: userId, email: `${userId}@example.test` }, secret: AUTH_SECRET, salt: 'authjs.session-token' });
    g.jar.set('authjs.session-token', token);
    const oldGuestId = g.jar.get('guest_session').split('.')[0];
    g.jar.set('guest_session', signGuestToken(oldGuestId, Date.now() - 1000));
    const s = await state(g);
    assert.equal(s.status, 200);
    assert.equal(s.body.identityType, 'account');
    assert.equal(s.body.identityId, userId, 'account identity resolves correctly regardless of guest cookie expiry');
  });

  await check("expired guest cannot continue old chat-attachment ownership; a fresh guest's own attachment stays private", async () => {
    const f = browser();
    await arrive(f);
    const oldGuestId = f.jar.get('guest_session').split('.')[0];
    const fd = new FormData();
    fd.append('photo', new Blob(['old-guest-bytes'], { type: 'image/jpeg' }), 'photo.jpg');
    const uploadRes = await f.request('/api/chat/attachments', { method: 'POST', body: fd });
    assert.equal(uploadRes.status, 200);
    const attachmentId = (await uploadRes.json()).id;
    f.jar.set('guest_session', signGuestToken(oldGuestId, Date.now() - 1000));
    const afterExpiry = await f.request(`/api/chat/attachments/${attachmentId}`);
    // Per the confirmed same-request propagation behavior, the very first
    // request after expiry sees no valid identity at all (401). Either way
    // the old bytes must never be served.
    assert.ok([401, 404].includes(afterExpiry.status), `expected 401 or 404, got ${afterExpiry.status}`);
    const secondTry = await f.request(`/api/chat/attachments/${attachmentId}`);
    assert.equal(secondTry.status, 404, "the new identity (now established) cannot read the old identity's chat attachment bytes");
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
