const test = require('node:test');
const assert = require('node:assert/strict');
const { privateOwner, isAllowedEmail } = require('../lib/privateAccess.cjs');

test('private mode admits only the configured email and refuses missing identity', () => {
  const old = process.env.PRIVATE_OWNER_EMAIL;
  try {
    process.env.PRIVATE_OWNER_EMAIL = ' Owner@Example.com ';
    assert.equal(privateOwner(), 'owner@example.com');
    assert.equal(isAllowedEmail('owner@example.com'), true);
    assert.equal(isAllowedEmail('OWNER@example.com'), true);
    for (const email of [null, undefined, '', 'other@example.com', 'owner+alias@example.com']) assert.equal(isAllowedEmail(email), false);
    delete process.env.PRIVATE_OWNER_EMAIL;
    assert.equal(isAllowedEmail('other@example.com'), true);
  } finally {
    if (old === undefined) delete process.env.PRIVATE_OWNER_EMAIL;
    else process.env.PRIVATE_OWNER_EMAIL = old;
  }
});
