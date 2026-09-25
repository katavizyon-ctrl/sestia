const test = require('node:test');
const assert = require('node:assert/strict');
const { createAttemptLimiter, clientKey, codesMatch } = require('../lib/attemptLimiter.cjs');

test('per-client lockout after repeated wrong codes, released after the window', () => {
  const limiter = createAttemptLimiter({ maxPerClient: 3, maxGlobal: 100, windowMs: 1000 });
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i += 1) {
    assert.equal(limiter.blockedFor('1.1.1.1', t0), 0);
    limiter.fail('1.1.1.1', t0);
  }
  assert.ok(limiter.blockedFor('1.1.1.1', t0) > 0);
  assert.equal(limiter.blockedFor('2.2.2.2', t0), 0, 'other clients are not affected');
  assert.equal(limiter.blockedFor('1.1.1.1', t0 + 1001), 0, 'window expiry releases the client');
});

test('a correct code clears that client\'s failures', () => {
  const limiter = createAttemptLimiter({ maxPerClient: 2, maxGlobal: 100, windowMs: 1000 });
  limiter.fail('a', 0);
  limiter.succeed('a');
  limiter.fail('a', 0);
  assert.equal(limiter.blockedFor('a', 0), 0);
});

test('global cap stops rotation across many client keys', () => {
  const limiter = createAttemptLimiter({ maxPerClient: 100, maxGlobal: 5, windowMs: 1000 });
  for (let i = 0; i < 5; i += 1) limiter.fail(`ip-${i}`, 0);
  assert.ok(limiter.blockedFor('fresh-ip', 0) > 0);
  assert.equal(limiter.blockedFor('fresh-ip', 1001), 0);
});

test('client key uses the last forwarded hop, not a spoofable first value', () => {
  const headers = (map) => ({ get: (k) => map[k] ?? null });
  assert.equal(clientKey(headers({ 'x-forwarded-for': '6.6.6.6, 10.0.0.9' })), '10.0.0.9');
  assert.equal(clientKey(headers({ 'x-real-ip': '10.0.0.7' })), '10.0.0.7');
  assert.equal(clientKey(headers({})), 'unknown');
});

test('code comparison is exact and length-independent', () => {
  assert.equal(codesMatch('davet-123', 'davet-123'), true);
  assert.equal(codesMatch('davet-12', 'davet-123'), false);
  assert.equal(codesMatch('', 'davet-123'), false);
  assert.equal(codesMatch('DAVET-123', 'davet-123'), false);
});
