const test = require('node:test');
const assert = require('node:assert/strict');
const sessionClient = require('../lib/sessionClient.cjs');
const { isQualifyingActivityEvent, shouldSendActivityReport, computeLifecycleView, remainingMs, warningCopy } = sessionClient;

function fakeEvent(overrides = {}) {
  return { type: 'click', isTrusted: true, repeat: false, target: { closest: () => null }, ...overrides };
}

test('isQualifyingActivityEvent: only the six trusted types count, never mousemove/scroll/focus/etc.', () => {
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'click' })), true);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'pointerdown' })), true);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'keydown' })), true);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'input' })), true);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'compositionend' })), true);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'change' })), true);
  for (const type of ['mousemove', 'pointermove', 'mouseover', 'wheel', 'scroll', 'focus', 'blur', 'visibilitychange', 'pageshow', 'pagehide', 'resize']) {
    assert.equal(isQualifyingActivityEvent(fakeEvent({ type })), false, `${type} must never count as activity`);
  }
});

test('isQualifyingActivityEvent: explicit `isTrusted: false` is rejected; undefined (test env) is allowed', () => {
  assert.equal(isQualifyingActivityEvent(fakeEvent({ isTrusted: false })), false);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ isTrusted: undefined })), true);
});

test('isQualifyingActivityEvent: a repeated keydown (held key) does not count; a non-repeat one does', () => {
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'keydown', repeat: true })), false);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ type: 'keydown', repeat: false })), true);
});

test('isQualifyingActivityEvent: events outside the app root are excluded; a warning-dismiss control opts itself out', () => {
  const appRoot = { contains: (el) => el?.inside === true };
  assert.equal(isQualifyingActivityEvent(fakeEvent({ target: { inside: false } }), { appRoot }), false);
  assert.equal(isQualifyingActivityEvent(fakeEvent({ target: { inside: true } }), { appRoot }), true);
  const dismissTarget = { closest: (sel) => (sel === '.dismiss' ? {} : null) };
  assert.equal(isQualifyingActivityEvent(fakeEvent({ target: dismissTarget }), { warningDismissSelector: '.dismiss' }), false);
});

test('shouldSendActivityReport: first report always sends; subsequent ones coalesce to at most one per 10s', () => {
  assert.equal(shouldSendActivityReport({ nowMs: 1000, lastReportSentAtMs: null }), true);
  assert.equal(shouldSendActivityReport({ nowMs: 1000, lastReportSentAtMs: 995 }), false, 'well within the 10s coalescing window');
  assert.equal(shouldSendActivityReport({ nowMs: 11000, lastReportSentAtMs: 1000 }), true, 'exactly 10s later is due');
  assert.equal(shouldSendActivityReport({ nowMs: 10999, lastReportSentAtMs: 1000 }), false, '1ms before the window closes');
});

test('shouldSendActivityReport: flushes immediately within 15s of a known deadline regardless of coalescing', () => {
  assert.equal(shouldSendActivityReport({ nowMs: 1000, lastReportSentAtMs: 999, idleExpiresAt: 1000 + 14000 }), true);
  assert.equal(shouldSendActivityReport({ nowMs: 1000, lastReportSentAtMs: 999, idleExpiresAt: 1000 + 16000 }), false);
});

test('computeLifecycleView: exact boundary semantics — warning at >=warningAt, expired at >=idleExpiresAt, expiry wins at exact equality', () => {
  const base = { lastActivityAtMs: 0, warningAfterMs: 180000, idleTimeoutMs: 300000 };
  assert.equal(computeLifecycleView({ ...base, serverNow: 179999 }).phase, 'active');
  assert.equal(computeLifecycleView({ ...base, serverNow: 180000 }).phase, 'warning');
  assert.equal(computeLifecycleView({ ...base, serverNow: 299999 }).phase, 'warning');
  assert.equal(computeLifecycleView({ ...base, serverNow: 300000 }).phase, 'expired', 'expiry takes precedence over warning at exact equality');
  assert.equal(computeLifecycleView({ ...base, serverNow: 300001 }).phase, 'expired');
});

test('remainingMs: never negative, never invents time beyond the real deadline', () => {
  assert.equal(remainingMs(1000, 500), 500);
  assert.equal(remainingMs(1000, 1000), 0);
  assert.equal(remainingMs(1000, 2000), 0, 'past the deadline -> 0, not negative');
});

test('warningCopy: exact locked Turkish copy per identity type', () => {
  assert.deepEqual(warningCopy('guest'), { title: 'Hâlâ burada mısın?', body: 'Misafir oturumun 2 dakika içinde sona erecek.' });
  assert.deepEqual(warningCopy('account'), {
    title: 'Hâlâ burada mısın?',
    body: 'Oturumun 5 dakika içinde sona erecek. Kaydedilmiş verilerin korunacak; yeniden e-postanla giriş yapman gerekecek.',
  });
});
