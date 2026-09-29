// Who may open /admin. Pure (no Next.js imports) so proxy.js can use it.
//
// Owner mode: when ADMIN_OWNER_EMAIL is set (or the whole app is in
// PRIVATE_OWNER_EMAIL lockdown), /admin requires that verified account with
// an ACTIVE Session V2 account session — the same binding the private-owner
// path in proxy.js already enforces. The shared ADMIN_ACCESS_CODE is then
// refused entirely, so it can never weaken the owner-only path.
//
// Code mode (neither variable set): the legacy shared-code gate remains for
// aggregate pages only; per-account detail and timelines are not rendered.
const crypto = require('node:crypto');

function ownerEmail() {
  return (process.env.ADMIN_OWNER_EMAIL || process.env.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
}
function ownerMode() {
  return Boolean(ownerEmail());
}
function isOwnerEmail(email) {
  const owner = ownerEmail();
  return Boolean(owner) && typeof email === 'string' && email.trim().toLowerCase() === owner;
}

// The Admin login surface (/admin-giris → POST /api/admin-login) issues an
// ordinary Session V2 login intent, plus this marker naming that exact
// intent. lib/auth.js binds a Session V2 session for an Admin-issued intent
// only when the verified email is the owner's, so the surface cannot be used
// to obtain an account session for anyone else. A later normal login issues
// a new intent, which this marker no longer matches.
const ADMIN_LOGIN_COOKIE = 'sestia_admin_login_v1';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function adminLoginMac(intentId, secret) {
  return crypto.createHmac('sha256', secret).update(`sestia-admin-login:${intentId}`).digest('hex');
}
function signAdminLogin(intentId, secret = process.env.AUTH_SECRET) {
  if (!secret) throw new Error('AUTH_SECRET is required');
  if (!UUID.test(intentId)) throw new Error('invalid_intent');
  return `${intentId}.${adminLoginMac(intentId, secret)}`;
}
// Returns the intent id the marker names, or null.
function verifyAdminLogin(value, secret = process.env.AUTH_SECRET) {
  if (typeof value !== 'string' || !secret) return null;
  const [intentId, sig, ...rest] = value.split('.');
  if (rest.length || !UUID.test(intentId || '') || !/^[a-f0-9]{64}$/.test(sig || '')) return null;
  return crypto.timingSafeEqual(Buffer.from(adminLoginMac(intentId, secret), 'hex'), Buffer.from(sig, 'hex')) ? intentId : null;
}

// A browser-relative /admin path, never an absolute URL. Behind Railway's
// proxy a route handler's req.url carries the container's internal origin
// (https://localhost:8080), so no redirect may be built from it. Anything
// that is not a same-origin /admin path falls back.
function adminReturnPath(raw, fallback = '/admin/oturumlar') {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    const base = 'https://admin-return.invalid';
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback; // absolute or protocol-relative
    if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

module.exports = { ownerEmail, ownerMode, isOwnerEmail, ADMIN_LOGIN_COOKIE, signAdminLogin, verifyAdminLogin, adminReturnPath };
