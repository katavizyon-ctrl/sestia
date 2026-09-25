// Explicit remote staging smoke test. Never included in npm test.
// Loads only local ACCESS_CODE/ADMIN_ACCESS_CODE for login, never prints secrets.
// Creates one clearly labelled room and a reference photo on the staging service.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('@next/env').loadEnvConfig(path.resolve(__dirname, '..'), true, { info() {}, error() {} });
const base = 'https://sestia-test-staging.up.railway.app';
const statePath = path.join(os.tmpdir(), 'sestia-staging-smoke-session.json');
const resume = process.argv.includes('--resume');
const state = resume ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { cookies: {} };
async function request(route, options = {}) {
  const headers = { ...options.headers, Cookie: Object.entries(state.cookies).map(([k,v]) => `${k}=${v}`).join('; ') };
  const response = await fetch(base + route, { ...options, headers, redirect: 'manual', signal: AbortSignal.timeout(90000) });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]; const idx = pair.indexOf('=');
    state.cookies[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return response;
}
async function json(route, body) {
  const response = await request(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, 200, `${route}: status ${response.status}`);
  return response.json();
}
(async () => {
  assert.equal((await request('/api/health')).status, 200);
  if (!resume) {
    const forged = await fetch(base + '/api/rooms', { headers: { Cookie: 'access_ok=1' } });
    assert.equal(forged.status, 401);
    const forgedAdmin = await fetch(base + '/api/admin/test', { headers: { Cookie: 'admin_ok=1' } });
    assert.equal(forgedAdmin.status, 401);
    await json('/api/access', { code: process.env.ACCESS_CODE });
    assert.equal((await request('/')).status, 200, 'dashboard navigation');
    assert.equal((await request('/api/state')).status, 200);
    await json('/api/admin-access', { code: process.env.ADMIN_ACCESS_CODE });
    assert.equal((await request('/admin')).status, 200);
    const created = await json('/api/rooms', { name: 'Yayın doğrulama odası', operationKey: crypto.randomUUID() });
    state.roomId = created.id;
    const bytes = fs.readFileSync(path.join(__dirname, '../public/sestia/atmosfer.png'));
    const form = new FormData();
    form.set('photo', new Blob([bytes], { type: 'image/png' }), 'yayin-test.png');
    form.set('operationKey', crypto.randomUUID());
    const response = await request(`/api/rooms/${state.roomId}/photos`, { method: 'POST', body: form });
    assert.equal(response.status, 200);
    const uploaded = await response.json();
    state.photoId = uploaded.id;
    state.photoHash = crypto.createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  }
  const rooms = await (await request('/api/rooms')).json();
  assert.ok(rooms.rooms.some(room => room.id === state.roomId));
  const photo = await request(`/api/rooms/${state.roomId}/photos/${state.photoId}`);
  assert.equal(photo.status, 200);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await photo.arrayBuffer())).digest('hex'), state.photoHash);
  console.log(resume ? 'PASS: room and exact photo bytes persisted after restart.' : 'PASS: signed access, admin, room creation, upload and photo retrieval.');
  if (process.argv.includes('--chat')) {
    const reply = await json('/api/sestia-chat', { messages: [{ role: 'user', content: 'Küçük bir odada çalışma masasını gün ışığına göre nasıl konumlandırabilirim? İki kısa cümleyle yanıtla.' }] });
    assert.ok(typeof reply.reply === 'string' && reply.reply.length > 10);
    console.log('PASS: real AI chat response received.');
  }
  if (process.argv.includes('--analysis')) {
    const form = new FormData();
    form.set('mode', 'tekli');
    form.set('image', new Blob([fs.readFileSync(path.join(__dirname, '../public/sestia/atmosfer.png'))], { type: 'image/png' }), 'test.png');
    const response = await request('/api/analyze', { method: 'POST', body: form });
    assert.equal(response.status, 200, 'real image analysis');
    const result = await response.json();
    assert.ok(typeof result.category === 'string');
    assert.ok(typeof result.reasoning === 'string');
    console.log('PASS: real photo analysis response received.');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
