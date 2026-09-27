// Pure boundary-logic tests for lib/guestToken.js's 1-hour rolling inactivity
// window. No server, no waiting real time: tokens are hand-crafted with
// specific `expires` timestamps (signed with a known AUTH_SECRET, exactly the
// way lib/guestToken.js itself signs them) to test the exact valid/expired
// boundary deterministically. Full-stack rotation/isolation behavior lives in
// tests/guest-onboarding-e2e.test.cjs instead of being duplicated here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

// lib/guestToken.js is authored as an ES module (import/export) for Next.js's
// own bundler; plain `node --test` cannot require() it directly. Same
// technique already used for route.js/db.js elsewhere in this suite: strip
// the import/export syntax and evaluate the real source in a vm context.
function loadGuestToken(secret) {
  const code = fs.readFileSync(path.join(__dirname, '../lib/guestToken.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = { crypto, Buffer, process: { env: { AUTH_SECRET: secret } } };
  vm.createContext(ctx);
  vm.runInContext(`${code}\nglobalThis.__api = { GUEST_COOKIE, createGuestToken, verifyGuestToken };`, ctx);
  return ctx.__api;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test('createGuestToken(): mints a fresh, different random UUID on each call (unchanged "new guest" behavior)', () => {
  const { createGuestToken } = loadGuestToken('s1');
  const a = createGuestToken();
  const b = createGuestToken();
  assert.notEqual(a.guestId, b.guestId);
  assert.match(a.guestId, UUID_RE);
});

test('createGuestToken(existingGuestId): renews the SAME identity, never mints a new one', () => {
  const { createGuestToken, verifyGuestToken } = loadGuestToken('s1');
  const first = createGuestToken();
  const renewed = createGuestToken(first.guestId);
  assert.equal(renewed.guestId, first.guestId, 'rolling renewal must keep abc123 as abc123, never xyz789');
  assert.equal(verifyGuestToken(renewed.token), first.guestId);
});

test('createGuestToken: a malformed/foreign existingGuestId argument is never trusted blindly', () => {
  const { createGuestToken } = loadGuestToken('s1');
  const result = createGuestToken('not-a-real-uuid');
  assert.notEqual(result.guestId, 'not-a-real-uuid');
  assert.match(result.guestId, UUID_RE, 'falls back to a freshly generated UUID instead');
});

test('createGuestToken: rolling window is 1 hour, not the old 180-day lifetime', () => {
  const { createGuestToken } = loadGuestToken('s1');
  const before = Date.now();
  const { expiresAt } = createGuestToken();
  const deltaMs = expiresAt.getTime() - before;
  assert.ok(deltaMs > 55 * 60 * 1000 && deltaMs <= 60 * 60 * 1000 + 5000, `expected ~1h window, got ${deltaMs}ms`);
});

test('verifyGuestToken: boundary — not-yet-expired verifies, already-expired is rejected (Date.now() > expires)', () => {
  const { verifyGuestToken } = loadGuestToken('boundary-secret');
  const guestId = crypto.randomUUID();
  const sign = (payload) => crypto.createHmac('sha256', 'boundary-secret').update(payload).digest('hex');
  const buildToken = (expires) => { const payload = `${guestId}.${expires}`; return `${payload}.${sign(payload)}`; };

  assert.equal(verifyGuestToken(buildToken(Date.now() + 1000)), guestId, '1s in the future: still valid');
  assert.equal(verifyGuestToken(buildToken(Date.now() - 1)), null, '1ms in the past: already expired');
  // Date.now() > expires is the exact rejection condition (see lib/guestToken.js) —
  // an expires timestamp equal to "now" is NOT yet in the past and must verify.
  const now = Date.now();
  assert.equal(verifyGuestToken(buildToken(now)), guestId, 'expires === now is not yet expired');
});

test('verifyGuestToken: still rejects tampered signature/guestId/expires (security model unchanged by the 1h switch)', () => {
  const { createGuestToken, verifyGuestToken } = loadGuestToken('s2');
  const { token } = createGuestToken();
  const [gid, exp, sig] = token.split('.');
  assert.equal(verifyGuestToken(`${gid}.${exp}.${'0'.repeat(sig.length)}`), null, 'tampered signature rejected');
  assert.equal(verifyGuestToken(`${crypto.randomUUID()}.${exp}.${sig}`), null, 'swapped guestId rejected');
  assert.equal(verifyGuestToken(`${gid}.${Number(exp) + 999999}.${sig}`), null, 'extended expiry without re-signing rejected');
  assert.equal(verifyGuestToken(null), null);
  assert.equal(verifyGuestToken(''), null);
  assert.equal(verifyGuestToken('not.enough.parts'), null);
});

test('verifyGuestToken: a token signed under a different server secret is never accepted', () => {
  const a = loadGuestToken('secret-a');
  const b = loadGuestToken('secret-b');
  const tokenFromA = a.createGuestToken().token;
  assert.equal(b.verifyGuestToken(tokenFromA), null);
});
