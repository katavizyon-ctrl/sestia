const NAME = 'staging-idle-v2';
function resolvePolicy(name, kind) {
  if (name !== NAME) throw Object.assign(new Error('session_policy_unconfigured'), { status: 503 });
  if (!['guest', 'account'].includes(kind)) throw new Error('invalid_session_kind');
  return Object.freeze({ version: 2, warningAfterMs: kind === 'guest' ? 180000 : 300000, idleTimeoutMs: kind === 'guest' ? 300000 : 600000 });
}
// Owner entry (Sestia has a single owner): an account session opened with the
// access code stays signed in for 30 days without activity; each activity
// pushes the deadline out again. Same policy version, longer per-session
// timing snapshot (see sessionStore check()).
const OWNER_TIMING = Object.freeze({ idleTimeoutMs: 30 * 24 * 60 * 60 * 1000, warningAfterMs: 29 * 24 * 60 * 60 * 1000 });
module.exports = { NAME, resolvePolicy, OWNER_TIMING };
