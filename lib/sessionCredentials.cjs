const crypto = require('node:crypto');
const GUEST_COOKIE = 'sestia_guest_v2', SCOPE_COOKIE = 'sestia_session_scope_v2', INTENT_COOKIE = 'sestia_login_intent_v2';
// Owner entry: the access code signs the owner straight into their account.
const OWNER_COOKIE = 'sestia_owner_v2';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function mac(purpose, id, secret) {
  if (!secret) throw new Error('AUTH_SECRET is required');
  if (!['guest','scope','intent','owner'].includes(purpose) || !UUID.test(id)) throw new Error('invalid_credential');
  return crypto.createHmac('sha256', secret).update(`sestia-session-v2:${purpose}:${id}`).digest('hex');
}
function sign(purpose, id, secret = process.env.AUTH_SECRET) { return `v2.${id}.${mac(purpose,id,secret)}`; }
function verify(purpose, value, secret = process.env.AUTH_SECRET) {
  if (typeof value !== 'string' || !secret) return null;
  const [version,id,sig,...rest] = value.split('.');
  if(rest.length || version!=='v2' || !UUID.test(id || '') || !/^[a-f0-9]{64}$/.test(sig || '')) return null;
  return crypto.timingSafeEqual(Buffer.from(mac(purpose,id,secret),'hex'),Buffer.from(sig,'hex')) ? id : null;
}
module.exports = { GUEST_COOKIE, SCOPE_COOKIE, INTENT_COOKIE, OWNER_COOKIE, sign, verify };
