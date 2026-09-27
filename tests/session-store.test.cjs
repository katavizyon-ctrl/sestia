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
test('credentials are versioned, purpose separated, signed and reject legacy/forged values',()=>{
  const id=randomUUID(),s='fake-test-secret';const token=credentials.sign('guest',id,s);
  assert.equal(credentials.verify('guest',token,s),id);assert.equal(credentials.verify('scope',token,s),null);
  assert.equal(credentials.verify('guest',token+'x',s),null);assert.equal(credentials.verify('guest',token,'other'),null);
  assert.equal(credentials.verify('guest',`${id}.${Date.now()+180*86400000}.old-signature`,s),null);
});
