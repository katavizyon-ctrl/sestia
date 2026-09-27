const { randomUUID, createHash } = require('node:crypto');
const { resolvePolicy } = require('./sessionPolicy.cjs');
const EVENTS = new Set(['pointerdown','click','keydown','input','compositionend','change']);
const fail = (code, status=409) => { throw Object.assign(new Error(code), { status }); };
const hash = v => createHash('sha256').update(v).digest('hex');
function createSessionStore(db, { now=Date.now, policyName=()=>process.env.SESTIA_SESSION_POLICY }={}) {
  db.transaction(()=>db.exec(`
    CREATE TABLE IF NOT EXISTS sestia_session_families (
      id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, current_session_id TEXT,
      created_at_ms INTEGER NOT NULL, last_transition_at_ms INTEGER NOT NULL,
      login_intent_hash TEXT, login_intent_expires_at_ms INTEGER, login_intent_revision INTEGER
    );
    CREATE TABLE IF NOT EXISTS sestia_sessions (
      id TEXT PRIMARY KEY, family_id TEXT NOT NULL REFERENCES sestia_session_families(id),
      family_revision INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('guest','account')),
      subject_id TEXT NOT NULL, policy_version INTEGER NOT NULL,
      idle_timeout_ms INTEGER NOT NULL, warning_after_ms INTEGER NOT NULL,
      created_at_ms INTEGER NOT NULL, last_activity_at_ms INTEGER NOT NULL,
      idle_expires_at_ms INTEGER NOT NULL, activity_revision INTEGER NOT NULL DEFAULT 0,
      ended_at_ms INTEGER, end_reason TEXT CHECK(end_reason IN ('idle','logout','replaced','policy')),
      creation_key_hash TEXT NOT NULL,
      CHECK(warning_after_ms > 0 AND warning_after_ms < idle_timeout_ms),
      CHECK(idle_expires_at_ms = last_activity_at_ms + idle_timeout_ms),
      CHECK((ended_at_ms IS NULL AND end_reason IS NULL) OR (ended_at_ms IS NOT NULL AND end_reason IS NOT NULL)),
      UNIQUE(family_id,family_revision), UNIQUE(family_id,creation_key_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_sestia_session_subject ON sestia_sessions(kind,subject_id);
    CREATE INDEX IF NOT EXISTS idx_sestia_session_expiry ON sestia_sessions(idle_expires_at_ms);
  `)).immediate();
  const family = id => db.prepare('SELECT * FROM sestia_session_families WHERE id=?').get(id) || null;
  const row = id => db.prepare('SELECT * FROM sestia_sessions WHERE id=?').get(id) || null;
  const policy = kind => resolvePolicy(policyName(),kind);
  function view(r,t=now()) {
    return { state:'active', sessionId:r.id, ownerId:r.subject_id, identityType:r.kind,
      lifecycleRevision:r.family_revision, policyVersion:r.policy_version, activityRevision:r.activity_revision,
      warningAt:r.last_activity_at_ms+r.warning_after_ms, idleExpiresAt:r.idle_expires_at_ms,
      warning:t>=r.last_activity_at_ms+r.warning_after_ms, serverNow:t };
  }
  function check(id,familyId,t=now()) {
    policy('guest');
    const r=row(id), f=family(familyId);
    if(!r || !f || r.family_id!==familyId) return { state:'session_required',serverNow:t };
    const base={sessionId:id,identityType:r.kind,serverNow:t};
    const p=policy(r.kind);
    // Each session's own idle_timeout_ms/warning_after_ms is an immutable,
    // server-issued snapshot (architecture doc §18): ordinary future changes
    // to the CURRENT policy's timing values must affect new sessions only,
    // never silently revoke an already-active one. Only an explicit
    // policy-VERSION bump is the intended invalidation mechanism.
    if(r.policy_version!==p.version) return {...base,state:'session_revoked'};
    if(f.current_session_id!==id || f.revision!==r.family_revision) return {...base,state:'session_replaced'};
    if(r.ended_at_ms!==null) return {...base,state:r.end_reason==='idle'?'session_expired':'session_revoked'};
    if(t>=r.idle_expires_at_ms) return {...base,state:'session_expired'};
    return view(r,t);
  }
  function bootstrap() {
    policy('guest');const id=randomUUID(),t=now();
    db.prepare('INSERT INTO sestia_session_families(id,created_at_ms,last_transition_at_ms) VALUES(?,?,?)').run(id,t,t);
    return family(id);
  }
  function key(v) { if(typeof v!=='string' || !/^[a-zA-Z0-9-]{16,100}$/.test(v)) fail('invalid_transition_key',400);return hash(v); }
  function establish(f,kind,subject,keyHash,t) {
    const p=policy(kind),id=randomUUID(),revision=f.revision+1;
    if(f.current_session_id) db.prepare("UPDATE sestia_sessions SET ended_at_ms=?,end_reason=CASE WHEN idle_expires_at_ms<=? THEN 'idle' ELSE 'replaced' END WHERE id=? AND ended_at_ms IS NULL").run(t,t,f.current_session_id);
    db.prepare(`INSERT INTO sestia_sessions(id,family_id,family_revision,kind,subject_id,policy_version,idle_timeout_ms,warning_after_ms,created_at_ms,last_activity_at_ms,idle_expires_at_ms,creation_key_hash)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,f.id,revision,kind,subject,p.version,p.idleTimeoutMs,p.warningAfterMs,t,t,t+p.idleTimeoutMs,keyHash);
    db.prepare('UPDATE sestia_session_families SET revision=?,current_session_id=?,last_transition_at_ms=?,login_intent_hash=NULL,login_intent_expires_at_ms=NULL,login_intent_revision=NULL WHERE id=?').run(revision,id,t,f.id);
    return view(row(id),t);
  }
  const guest = db.transaction((familyId,expectedRevision,creationKey)=>{
    const f=family(familyId),h=key(creationKey),t=now();if(!f) fail('session_required',401);
    const existing=db.prepare('SELECT * FROM sestia_sessions WHERE family_id=? AND creation_key_hash=?').get(familyId,h);
    if(existing) {
      if(existing.kind==='guest' && t-existing.created_at_ms<=15000 && check(existing.id,familyId,t).state==='active') return view(existing,t);
      fail('session_replaced');
    }
    if(f.revision!==expectedRevision) fail('session_replaced');
    if(f.current_session_id && check(f.current_session_id,familyId,t).state==='active') fail('session_already_active');
    return establish(f,'guest',randomUUID(),h,t);
  });
  const loginIntent = db.transaction((familyId,revision,intent)=>{
    policy('account');const f=family(familyId);if(!f || f.revision!==revision) fail('session_replaced');
    db.prepare('UPDATE sestia_session_families SET login_intent_hash=?,login_intent_expires_at_ms=?,login_intent_revision=? WHERE id=?').run(key(intent),now()+15*60000,revision,familyId);
  });
  const account = db.transaction((familyId,intent,subject)=>{
    const f=family(familyId),h=key(intent),t=now();
    if(!f || f.login_intent_hash!==h || f.login_intent_revision!==f.revision || t>=f.login_intent_expires_at_ms) fail('login_intent_expired',401);
    if(typeof subject!=='string' || !subject) fail('invalid_account',401);
    return establish(f,'account',subject,h,t);
  });
  const activity = db.transaction((id,familyId,eventAt,event)=>{
    const t=now(),active=check(id,familyId,t);if(active.state!=='active') fail(active.state,401);
    if(!EVENTS.has(event) || !Number.isSafeInteger(eventAt) || eventAt>t || t-eventAt>15000) fail('invalid_activity',400);
    const r=row(id);if(eventAt>r.last_activity_at_ms) db.prepare('UPDATE sestia_sessions SET last_activity_at_ms=?,idle_expires_at_ms=?,activity_revision=activity_revision+1 WHERE id=?').run(eventAt,eventAt+r.idle_timeout_ms,id);
    return view(row(id),t);
  });
  const logout = db.transaction((id,familyId)=>{
    const f=family(familyId);if(!f || f.current_session_id!==id) return false;
    const t=now();db.prepare("UPDATE sestia_sessions SET ended_at_ms=?,end_reason='logout' WHERE id=? AND ended_at_ms IS NULL").run(t,id);
    // Advance revision to fence pending login intents and stale transitions.
    db.prepare('UPDATE sestia_session_families SET revision=revision+1,login_intent_hash=NULL,login_intent_expires_at_ms=NULL,login_intent_revision=NULL,last_transition_at_ms=? WHERE id=?').run(t,familyId);
    return true;
  });
  function claim(id,familyId,fn) { return db.transaction(()=>{const s=check(id,familyId);if(s.state!=='active')fail(s.state,401);return fn(s);}).immediate(); }
  return {bootstrap,family,row,check,claim,guest:(...a)=>guest.immediate(...a),account:(...a)=>account.immediate(...a),loginIntent:(...a)=>loginIntent.immediate(...a),activity:(...a)=>activity.immediate(...a),logout:(...a)=>logout.immediate(...a)};
}
module.exports={createSessionStore};
