const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createAccessToken, verifyAccessToken } = require('../lib/accessToken.cjs');

test('access gates reject forged, expired and wrong-scope cookies', () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'isolated-access-token-test-secret';
  try {
    const access = createAccessToken('access');
    const admin = createAccessToken('admin');
    assert.equal(verifyAccessToken(access, 'access'), true);
    assert.equal(verifyAccessToken(admin, 'admin'), true);
    assert.equal(verifyAccessToken(access, 'admin'), false);
    assert.equal(verifyAccessToken(admin, 'access'), false);
    for (const value of ['1', '', undefined, access + 'a', access.replace('access', 'admin')]) {
      assert.equal(verifyAccessToken(value, 'admin'), false);
    }
    const expired = `admin.${Date.now() - 1000}.${'a'.repeat(32)}`;
    const mac = crypto.createHmac('sha256', process.env.AUTH_SECRET).update(expired).digest('hex');
    assert.equal(verifyAccessToken(`${expired}.${mac}`, 'admin'), false);
    process.env.AUTH_SECRET = 'rotated';
    assert.equal(verifyAccessToken(admin, 'admin'), false);
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  }
});
