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

test('email-only test mode: explicit flag or owner-only mode, never by default', () => {
  const { emailRequired } = require('../lib/privateAccess.cjs');
  const saved = { owner: process.env.PRIVATE_OWNER_EMAIL, flag: process.env.EMAIL_LOGIN_REQUIRED };
  try {
    delete process.env.PRIVATE_OWNER_EMAIL; delete process.env.EMAIL_LOGIN_REQUIRED;
    assert.equal(emailRequired(), false);
    process.env.EMAIL_LOGIN_REQUIRED = '1';
    assert.equal(emailRequired(), true);
    assert.equal(isAllowedEmail('anyone@example.com'), true, 'the flag does not restrict which email may sign in');
    process.env.EMAIL_LOGIN_REQUIRED = 'yes';
    assert.equal(emailRequired(), false);
    delete process.env.EMAIL_LOGIN_REQUIRED;
    process.env.PRIVATE_OWNER_EMAIL = 'owner@example.com';
    assert.equal(emailRequired(), true);
  } finally {
    for (const [key, value] of [['PRIVATE_OWNER_EMAIL', saved.owner], ['EMAIL_LOGIN_REQUIRED', saved.flag]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
