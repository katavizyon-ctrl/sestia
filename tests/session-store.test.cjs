const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { resolvePolicy } = require('../lib/sessionPolicy.cjs');
const { createSessionStore } = require('../lib/sessionStore.cjs');
const credentials = require('../lib/sessionCredentials.cjs');
const { randomUUID } = require('node:crypto');
function fixture() {
  let time = 1000000;
  const db = new Database(':memory:');
  const store = createSessionStore(db, { now: () => time, policyName: () => 'staging-idle-v2' });
  const family = store.bootstrap();
  return { db, store, family, now: () => time, at: n => { time = 1000000 + n; },
    start(kind = 'guest', owner = 'account-one') {
      const f = store.family(family.id);
      if (kind === 'guest') return store.guest(f.id, f.revision, randomUUID());
      const intent = randomUUID(); store.loginIntent(f.id, f.revision, intent);
      return store.account(f.id, intent, owner);
    } };
}
test('policy: missing/unknown policy and invalid kind fail closed; exact per-kind snapshots', () => {
  for (const p of [undefined, '', 'production']) assert.throws(() => resolvePolicy(p, 'guest'));
  assert.deepEqual(resolvePolicy('staging-idle-v2', 'guest'), { version: 2, warningAfterMs: 180000, idleTimeoutMs: 300000 });
  assert.deepEqual(resolvePolicy('staging-idle-v2', 'account'), { version: 2, warningAfterMs: 300000, idleTimeoutMs: 600000 });
  assert.throws(() => resolvePolicy('staging-idle-v2', 'admin'));
});
for (const [kind, warning, expiry] of [['guest',180000,300000],['account',300000,600000]]) {
  for (const delta of [-1,0,1]) test(`${kind}: warning boundary ${delta}ms`, () => {
    const f=fixture(), s=f.start(kind); f.at(warning+delta);
    const r=f.store.check(s.sessionId,f.family.id); assert.equal(r.state,'active'); assert.equal(r.warning,delta>=0);
    assert.equal(r.idleExpiresAt,1000000+expiry); f.db.close();
  });
  for (const delta of [-1,0,1]) test(`${kind}: expiry boundary ${delta}ms`, () => {
    const f=fixture(),s=f.start(kind);f.at(expiry+delta);
    assert.equal(f.store.check(s.sessionId,f.family.id).state,delta<0?'active':'session_expired');
    if(delta>=0) assert.throws(()=>f.store.activity(s.sessionId,f.family.id,f.now()-1,'click'));
    f.db.close();
  });
  for (const t of [warning-1000,kind==='guest'?240000:480000]) test(`${kind}: accepted interaction at ${t} resets both deadlines`,()=>{
    const f=fixture(),s=f.start(kind); f.at(t);
    const r=f.store.activity(s.sessionId,f.family.id,f.now(),'input');
    assert.equal(r.warningAt,f.now()+warning);assert.equal(r.idleExpiresAt,f.now()+expiry);assert.equal(r.ownerId,s.ownerId);assert.equal(r.warning,false);f.db.close();
  });
  test(`${kind}: status/background reads never renew; delayed/out-of-order reports cannot move activity back`,()=>{
    const f=fixture(),s=f.start(kind);f.at(warning);
    for(let i=0;i<10;i++) assert.equal(f.store.check(s.sessionId,f.family.id).idleExpiresAt,s.idleExpiresAt);
    f.store.activity(s.sessionId,f.family.id,f.now()-5000,'click');
    const a=f.store.check(s.sessionId,f.family.id);f.store.activity(s.sessionId,f.family.id,f.now()-6000,'click');
    assert.equal(f.store.check(s.sessionId,f.family.id).idleExpiresAt,a.idleExpiresAt);
    for(const event of ['timer','focus','scroll','telemetry']) assert.throws(()=>f.store.activity(s.sessionId,f.family.id,f.now(),event));
    assert.throws(()=>f.store.activity(s.sessionId,f.family.id,f.now()+1,'click'));
    assert.throws(()=>f.store.activity(s.sessionId,f.family.id,f.now()-15001,'click'));f.db.close();
  });
}
test('guest creation is explicit, idempotent/current-only; expiry preserves old owner and creates different UUID',()=>{
  const f=fixture(),key=randomUUID(),s=f.store.guest(f.family.id,0,key);
  assert.equal(f.store.guest(f.family.id,0,key).sessionId,s.sessionId);
  assert.throws(()=>f.store.guest(f.family.id,0,randomUUID()));
  f.at(300000);const next=f.start();assert.notEqual(next.ownerId,s.ownerId);
  assert.equal(f.db.prepare('SELECT subject_id FROM sestia_sessions WHERE id=?').get(s.sessionId).subject_id,s.ownerId);
  assert.throws(()=>f.store.guest(f.family.id,0,key));f.db.close();
});
test('same account gets a new session, stale logout cannot revoke successor; devices independent',()=>{
  const f=fixture(),s=f.start('account');f.at(600000);const next=f.start('account');
  assert.equal(next.ownerId,s.ownerId);assert.notEqual(next.sessionId,s.sessionId);
  f.store.logout(s.sessionId,f.family.id);assert.equal(f.store.check(next.sessionId,f.family.id).state,'active');
  const other=f.store.bootstrap();const i=randomUUID();f.store.loginIntent(other.id,0,i);const b=f.store.account(other.id,i,s.ownerId);
  f.store.logout(next.sessionId,f.family.id);assert.equal(f.store.check(b.sessionId,other.id).state,'active');f.db.close();
});
test('login intent is single use and bound to family revision; reads do not create rows',()=>{
  const f=fixture(),i=randomUUID();f.store.loginIntent(f.family.id,0,i);const s=f.store.account(f.family.id,i,'a');
  assert.throws(()=>f.store.account(f.family.id,i,'a'));assert.equal(f.store.check(s.sessionId,'foreign').state,'session_required');
  assert.equal(f.store.check('legacy',f.family.id).state,'session_required');assert.equal(f.db.prepare('SELECT count(*) n FROM sestia_sessions').get().n,1);f.db.close();
});
// Policy snapshot (SESTIA_SESSION_V2_INDEPENDENT_CODE_REVIEW.md HIGH-2): each
// session's own idle_timeout_ms/warning_after_ms is an immutable server-
// issued snapshot. Ordinary future changes to the CURRENT policy's timing
// VALUES must affect new sessions only, never silently revoke an already
// -active one — only an explicit policy_version change is the intended
// invalidation mechanism. Simulated here by directly diverging a row's own
// stored snapshot from what resolvePolicy('staging-idle-v2', kind) actually
// returns (there being only one real named policy to resolve against),
// which is exactly what "the deployed policy's numbers were retuned"
// looks like from check()'s point of view.
test('policy snapshot: ordinary timing-value drift (same policy_version) does not revoke an active session', () => {
  const f = fixture(), s = f.start('guest');
  const row = f.db.prepare('SELECT last_activity_at_ms FROM sestia_sessions WHERE id=?').get(s.sessionId);
  const driftedTimeout = 999999;
  f.db.prepare('UPDATE sestia_sessions SET idle_timeout_ms=?, warning_after_ms=?, idle_expires_at_ms=? WHERE id=?')
    .run(driftedTimeout, 111111, row.last_activity_at_ms + driftedTimeout, s.sessionId);
  const result = f.store.check(s.sessionId, f.family.id);
  assert.equal(result.state, 'active', 'a retuned CURRENT policy value must never revoke an already-established session');
  f.db.close();
});
test('policy snapshot: an explicit policy_version mismatch still invalidates the session', () => {
  const f = fixture(), s = f.start('guest');
  f.db.prepare('UPDATE sestia_sessions SET policy_version = ? WHERE id = ?').run(999, s.sessionId);
  const result = f.store.check(s.sessionId, f.family.id);
  assert.equal(result.state, 'session_revoked', 'a policy_version mismatch is the intended, explicit invalidation mechanism');
  f.db.close();
});
test('policy snapshot: a newly established session always gets the current real policy snapshot, unaffected by another row\'s manual drift', () => {
  const f = fixture(), old = f.start('guest');
  const oldRow = f.db.prepare('SELECT last_activity_at_ms FROM sestia_sessions WHERE id=?').get(old.sessionId);
  f.db.prepare('UPDATE sestia_sessions SET idle_timeout_ms=2, warning_after_ms=1, idle_expires_at_ms=? WHERE id=?')
    .run(oldRow.last_activity_at_ms + 2, old.sessionId);
  f.at(300000);
  const fresh = f.start('guest');
  const freshRow = f.db.prepare('SELECT idle_timeout_ms, warning_after_ms, policy_version FROM sestia_sessions WHERE id=?').get(fresh.sessionId);
  assert.deepEqual(freshRow, { idle_timeout_ms: 300000, warning_after_ms: 180000, policy_version: 2 });
  f.db.close();
});
test('credentials are versioned, purpose separated, signed and reject legacy/forged values',()=>{
  const id=randomUUID(),s='fake-test-secret';const token=credentials.sign('guest',id,s);
  assert.equal(credentials.verify('guest',token,s),id);assert.equal(credentials.verify('scope',token,s),null);
  assert.equal(credentials.verify('guest',token+'x',s),null);assert.equal(credentials.verify('guest',token,'other'),null);
  assert.equal(credentials.verify('guest',`${id}.${Date.now()+180*86400000}.old-signature`,s),null);
});

// ---------------- owner entry (lib/ownerEntry.js) ----------------
const { OWNER_TIMING } = require('../lib/sessionPolicy.cjs');
const DAY = 24 * 60 * 60 * 1000;
test('owner entry: an account session that stays signed in for 30 days, warned on day 29', () => {
  const f = fixture();
  const s = f.store.owner(f.family.id, 'owner-user');
  assert.equal(s.identityType, 'account');
  assert.equal(s.ownerId, 'owner-user');
  assert.deepEqual({ ...OWNER_TIMING }, { idleTimeoutMs: 30 * DAY, warningAfterMs: 29 * DAY });
  f.at(29 * DAY - 1);
  assert.equal(f.store.check(s.sessionId, f.family.id).warning, false);
  f.at(29 * DAY);
  const warned = f.store.check(s.sessionId, f.family.id);
  assert.equal(warned.state, 'active'); assert.equal(warned.warning, true);
  f.at(30 * DAY);
  assert.equal(f.store.check(s.sessionId, f.family.id).state, 'session_expired');
});
test('owner entry: activity pushes the 30-day deadline out again', () => {
  const f = fixture();
  const s = f.store.owner(f.family.id, 'owner-user');
  f.at(20 * DAY);
  const renewed = f.store.activity(s.sessionId, f.family.id, f.now(), 'click');
  assert.equal(renewed.idleExpiresAt, f.now() + 30 * DAY);
  f.at(45 * DAY);
  assert.equal(f.store.check(s.sessionId, f.family.id).state, 'active', '25 days after the last activity');
});
test('owner entry: replaces an earlier session in the same browser; other kinds keep their short timing', () => {
  const f = fixture();
  const old = f.start('account', 'owner-user');
  const s = f.store.owner(f.family.id, 'owner-user');
  assert.equal(f.store.check(old.sessionId, f.family.id).state, 'session_replaced');
  assert.equal(f.store.check(s.sessionId, f.family.id).state, 'active');
  const g = fixture().start('guest');
  assert.equal(g.idleExpiresAt - 1000000, 300000, 'guests unchanged');
  assert.throws(() => f.store.owner(randomUUID(), 'owner-user'), /session_required/, 'unknown family');
  assert.throws(() => f.store.owner(f.family.id, ''), /invalid_account/);
});
test('owner entry: the owner cookie is its own signed purpose', () => {
  const id = randomUUID();
  const signed = credentials.sign('owner', id, 'secret');
  assert.equal(credentials.verify('owner', signed, 'secret'), id);
  assert.equal(credentials.verify('guest', signed, 'secret'), null, 'an owner cookie is not a guest cookie');
  assert.equal(credentials.verify('owner', credentials.sign('guest', id, 'secret'), 'secret'), null);
});
