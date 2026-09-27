const NAME = 'staging-idle-v2';
function resolvePolicy(name, kind) {
  if (name !== NAME) throw Object.assign(new Error('session_policy_unconfigured'), { status: 503 });
  if (!['guest', 'account'].includes(kind)) throw new Error('invalid_session_kind');
  return Object.freeze({ version: 2, warningAfterMs: kind === 'guest' ? 180000 : 300000, idleTimeoutMs: kind === 'guest' ? 300000 : 600000 });
}
module.exports = { NAME, resolvePolicy };
