const test = require('node:test');
const assert = require('node:assert/strict');
const adminAccess = require('../lib/adminAccess.cjs');

const SECRET = 'admin-access-test-secret';
const INTENT = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return fn(); } finally { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
}

test('owner email match is exact (case/space-insensitive) and needs a configured owner', () => {
  withEnv({ ADMIN_OWNER_EMAIL: ' Owner@Example.test ', PRIVATE_OWNER_EMAIL: undefined }, () => {
    assert.equal(adminAccess.ownerMode(), true);
    assert.equal(adminAccess.isOwnerEmail('owner@example.test'), true);
    assert.equal(adminAccess.isOwnerEmail('OWNER@example.test '), true);
    assert.equal(adminAccess.isOwnerEmail('owner@example.test.evil'), false);
    assert.equal(adminAccess.isOwnerEmail(''), false);
    assert.equal(adminAccess.isOwnerEmail(null), false);
  });
  withEnv({ ADMIN_OWNER_EMAIL: undefined, PRIVATE_OWNER_EMAIL: undefined }, () => {
    assert.equal(adminAccess.ownerMode(), false);
    assert.equal(adminAccess.isOwnerEmail(''), false, 'no owner configured never matches anything');
  });
});

test('admin login marker names exactly one intent and cannot be forged or re-pointed', () => {
  const marker = adminAccess.signAdminLogin(INTENT, SECRET);
  assert.equal(adminAccess.verifyAdminLogin(marker, SECRET), INTENT);
  assert.equal(adminAccess.verifyAdminLogin(marker, 'another-secret'), null);
  const [, sig] = marker.split('.');
  assert.equal(adminAccess.verifyAdminLogin(`4f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b.${sig}`, SECRET), null, 'signature is bound to the intent id');
  for (const bad of [undefined, '', 'x', `${INTENT}`, `${INTENT}.${sig}.extra`, `not-a-uuid.${sig}`]) {
    assert.equal(adminAccess.verifyAdminLogin(bad, SECRET), null);
  }
  assert.throws(() => adminAccess.signAdminLogin('not-a-uuid', SECRET), /invalid_intent/);
});

test('admin return path is always a relative /admin path — never an origin, never outside /admin', () => {
  const p = adminAccess.adminReturnPath;
  assert.equal(p('/admin/oturumlar?tur=guest&test=include'), '/admin/oturumlar?tur=guest&test=include');
  assert.equal(p('/admin'), '/admin');
  assert.equal(p('/admin/hesaplar/abc'), '/admin/hesaplar/abc');
  // Railway's internal origin, other hosts and protocol-relative targets.
  assert.equal(p('https://localhost:8080/admin/oturumlar'), '/admin/oturumlar');
  assert.equal(p('https://evil.example.test/admin/oturumlar'), '/admin/oturumlar');
  assert.equal(p('//evil.example.test/admin'), '/admin/oturumlar');
  assert.equal(p('/\\evil.example.test/admin'), '/admin/oturumlar');
  assert.equal(p('javascript:alert(1)'), '/admin/oturumlar');
  // Outside /admin, including traversal and look-alike prefixes.
  assert.equal(p('/'), '/admin/oturumlar');
  assert.equal(p('/admin-giris'), '/admin/oturumlar');
  assert.equal(p('/administrator'), '/admin/oturumlar');
  assert.equal(p('/admin/../api/state'), '/admin/oturumlar');
  assert.equal(p(undefined), '/admin/oturumlar');
  assert.equal(p('', '/admin'), '/admin');
  for (const raw of ['/admin/oturumlar', 'https://localhost:8080/admin', '//x/admin']) {
    assert.ok(!/^[a-z]+:|^\/\//i.test(p(raw)), `never absolute: ${p(raw)}`);
  }
});
