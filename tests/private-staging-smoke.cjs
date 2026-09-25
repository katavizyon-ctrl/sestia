// Explicit read-only check of the owner's private staging gate; sends no email.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const base = 'https://sestia-test-staging.up.railway.app';
(async () => {
  for (const route of ['/', '/hosgeldin', '/giris', '/admin']) {
    const r = await fetch(base + route, { redirect: 'manual' });
    assert.equal(r.status, 307, route);
    assert.equal(new URL(r.headers.get('location'), base).pathname, '/ozel-giris');
    assert.match(r.headers.get('x-robots-tag'), /noindex/);
  }
  for (const route of ['/api/state', '/api/rooms', '/api/admin/test']) {
    const r = await fetch(base + route, { headers: { Cookie: 'access_ok=1; admin_ok=1' } });
    assert.equal(r.status, 401, route);
  }
  const oldPath = path.join(os.tmpdir(), 'sestia-staging-smoke-session.json');
  if (fs.existsSync(oldPath)) {
    const state = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
    const cookie = Object.entries(state.cookies).map(([k,v]) => `${k}=${v}`).join('; ');
    assert.equal((await fetch(base + '/api/rooms', { headers: { Cookie: cookie } })).status, 401, 'old signed guest/admin session');
  }
  const login = await fetch(base + '/ozel-giris');
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Sana özel bir alan/);
  assert.equal((await fetch(base + '/api/health')).status, 200);
  console.log('PASS: private login visible; app, admin and APIs blocked; old sessions refused. No email sent.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
