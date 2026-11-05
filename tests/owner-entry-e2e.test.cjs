// Owner entry (lib/ownerEntry.js) end to end, on a real `next dev` server
// with OWNER_ENTRY=1, against an isolated copy of the app and database.
// The access-code step is skipped in development exactly as in
// tests/guest-onboarding-e2e.test.cjs, which keeps covering the guest/email
// entry with owner entry off.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const credentials = require('../lib/sessionCredentials.cjs');
const root = path.resolve(__dirname, '..');
const PORT = 3005;
const BASE = `http://127.0.0.1:${PORT}`;
const AUTH_SECRET = 'sestia-owner-entry-e2e-only-not-production';
const OWNER_EMAIL = 'owner@example.test';
const DAY = 24 * 60 * 60 * 1000;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-owner-e2e-'));
for (const name of ['app', 'lib', 'components', 'public', 'SESTIA_BILGI_KUTUPHANESI', 'package.json', 'next.config.mjs', 'jsconfig.json', 'proxy.js']) {
  fs.cpSync(path.join(root, name), path.join(directory, name), { recursive: true });
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'junction');
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'ComSpec']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', AUTH_SECRET, ACCESS_CODE: 'e2e',
  ADMIN_ACCESS_CODE: 'e2e-admin', ANTHROPIC_API_KEY: 'isolated-no-real-key', SESTIA_SESSION_POLICY: 'staging-idle-v2',
  ADMIN_OWNER_EMAIL: OWNER_EMAIL, OWNER_ENTRY: '1' });
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(PORT)],
  { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });

function dbConn() {
  const Database = require('better-sqlite3');
  return new Database(path.join(directory, 'data', 'app.db'), { timeout: 10000 });
}
// One cookie jar per simulated browser; an emptied cookie is removed.
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
        const name = pair.slice(0, index), value = pair.slice(index + 1);
        if (value) jar.set(name, value); else jar.delete(name);
      }
      return res;
    },
  };
}
const json = { 'Content-Type': 'application/json' };
async function enterCode(b) {
  const res = await b.request('/api/access', { method: 'POST', headers: json, body: JSON.stringify({ code: '' }) });
  assert.equal(res.status, 200, 'the access code is accepted');
  return res;
}
async function state(b) {
  const res = await b.request('/api/state');
  return { status: res.status, body: await res.json() };
}
async function session(b) {
  return (await b.request('/api/session')).json();
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
  // The owner already has an account with a room (made by an email sign-in).
  const ownerId = `owner-${crypto.randomUUID()}`;
  await (await fetch(`${BASE}/api/health`)).text(); // the database exists once the app has answered
  {
    const db = dbConn();
    db.prepare('INSERT INTO auth_user (id, name, email) VALUES (?, ?, ?)').run(ownerId, 'Sahip', OWNER_EMAIL);
    db.prepare('INSERT INTO rooms (device_id, name) VALUES (?, ?)').run(ownerId, 'Salon');
    db.close();
  }

  await check('the code alone signs the owner into their own account, with their rooms', async () => {
    const o = browser();
    await enterCode(o);
    assert.ok(o.jar.get(credentials.OWNER_COOKIE), 'the owner cookie is set');
    const s = await state(o);
    assert.equal(s.status, 200, 'no name, email or guest step is needed');
    const me = await session(o);
    assert.equal(me.state, 'active');
    assert.equal(me.identityType, 'account');
    assert.equal(me.ownerId, ownerId, 'the existing account, not a new one');
    assert.ok(me.idleExpiresAt - me.serverNow > 29 * DAY, 'signed in for 30 days');
    const rooms = await (await o.request('/api/rooms')).json();
    assert.ok(JSON.stringify(rooms).includes('Salon'), 'the owner sees their existing room');
  });

  await check('an old expired email sign-in in the browser no longer gets in the way, and is cleared', async () => {
    const { encode } = await import(require('node:url').pathToFileURL(path.join(root, 'node_modules/next-auth/jwt.js')).href);
    const o = browser();
    o.jar.set('authjs.session-token', await encode({ token: { sub: ownerId, id: ownerId, email: OWNER_EMAIL }, secret: AUTH_SECRET, salt: 'authjs.session-token' }));
    assert.equal((await state(o)).status, 401, 'before: the stale sign-in blocks everything');
    await enterCode(o);
    assert.equal(o.jar.get('authjs.session-token'), undefined, 'the stale sign-in cookie is removed');
    assert.equal((await state(o)).status, 200, 'after: straight in');
  });

  await check('activity keeps the owner signed in; the code screen is skipped while signed in', async () => {
    const o = browser();
    await enterCode(o);
    const act = await o.request('/api/session/activity', { method: 'POST', headers: { ...json, Origin: BASE }, body: JSON.stringify({ event: 'click', eventAt: Date.now() }) });
    assert.equal(act.status, 200, 'activity is accepted for the owner session');
    const body = await act.json();
    assert.ok(body.idleExpiresAt - body.serverNow > 29 * DAY);
    const code = await o.request('/giris');
    assert.equal(code.status, 307);
    assert.equal(new URL(code.headers.get('location'), BASE).pathname, '/');
  });

  await check('after 30 days without activity the app sends the owner back to the code, which signs them in again', async () => {
    const o = browser();
    await enterCode(o);
    const sid = credentials.verify('owner', o.jar.get(credentials.OWNER_COOKIE), AUTH_SECRET);
    const db = dbConn();
    const last = Date.now() - 31 * DAY;
    db.prepare('UPDATE sestia_sessions SET last_activity_at_ms = ?, idle_expires_at_ms = ? + idle_timeout_ms WHERE id = ?').run(last, last, sid);
    db.close();
    const s = await state(o);
    assert.equal(s.status, 401);
    assert.equal(s.body.ownerEntry, true, 'the client is told to go to the code screen');
    assert.equal((await o.request('/giris')).status, 200, 'the code screen is reachable again');
    await enterCode(o);
    assert.equal((await state(o)).status, 200, 'signed in again with the code');
  });

  await check('signing out ends the owner session', async () => {
    const o = browser();
    await enterCode(o);
    const out = await o.request('/api/session/logout', { method: 'POST', headers: { Origin: BASE } });
    assert.equal(out.status, 200);
    assert.equal(o.jar.get(credentials.OWNER_COOKIE), undefined, 'the owner cookie is removed');
    assert.equal((await state(o)).status, 401);
  });

  await check('a forged or foreign owner cookie is ignored', async () => {
    const o = browser();
    await enterCode(o);
    o.jar.set(credentials.OWNER_COOKIE, credentials.sign('owner', crypto.randomUUID(), 'some-other-secret'));
    assert.equal((await state(o)).status, 401, 'wrong signature');
    const other = browser();
    await enterCode(other);
    const otherScope = other.jar.get(credentials.SCOPE_COOKIE);
    const stranger = browser();
    stranger.jar.set(credentials.OWNER_COOKIE, other.jar.get(credentials.OWNER_COOKIE));
    stranger.jar.set('access_ok', other.jar.get('access_ok'));
    assert.notEqual(stranger.jar.get(credentials.SCOPE_COOKIE), otherScope);
    assert.equal((await state(stranger)).status, 401, 'an owner cookie only works with the browser it was issued to');
  });

  console.log(results.join('\n'));
  if (process.exitCode) console.log(log.slice(-3000));
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  child.kill();
  setTimeout(() => {
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('sestia-owner-e2e-')) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch {}
    }
    process.exit();
  }, 1500);
});
