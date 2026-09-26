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

test('guests are refused only in owner-only mode; email is never required otherwise', () => {
  const { emailRequired } = require('../lib/privateAccess.cjs');
  const saved = { owner: process.env.PRIVATE_OWNER_EMAIL, flag: process.env.EMAIL_LOGIN_REQUIRED };
  try {
    delete process.env.PRIVATE_OWNER_EMAIL; delete process.env.EMAIL_LOGIN_REQUIRED;
    assert.equal(emailRequired(), false);
    // Guest onboarding regression: this retired switch used to hide
    // "Misafir olarak devam et" and make a name mandatory on staging.
    process.env.EMAIL_LOGIN_REQUIRED = '1';
    assert.equal(emailRequired(), false);
    assert.equal(isAllowedEmail('anyone@example.com'), true, 'any email may still sign in');
    delete process.env.EMAIL_LOGIN_REQUIRED;
    process.env.PRIVATE_OWNER_EMAIL = 'owner@example.com';
    assert.equal(emailRequired(), true);
  } finally {
    for (const [key, value] of [['PRIVATE_OWNER_EMAIL', saved.owner], ['EMAIL_LOGIN_REQUIRED', saved.flag]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
