import crypto from 'node:crypto';
import rawDb, { sessions } from '@/lib/db';
import adminAccess from '@/lib/adminAccess.cjs';
import credentials from '@/lib/sessionCredentials.cjs';

// Owner entry. Sestia has a single owner (ADMIN_OWNER_EMAIL, or
// PRIVATE_OWNER_EMAIL): entering the access code signs them straight into
// their own account, with no name, email-code or guest screens, and keeps
// them signed in on that device for 30 days without activity (see
// OWNER_TIMING in lib/sessionPolicy.cjs). On only with OWNER_ENTRY=1 and an
// owner email; otherwise the earlier guest/email entry stays as it was.

export const ownerEntryEnabled = () => process.env.OWNER_ENTRY === '1' && adminAccess.ownerMode();

// The owner's existing account (the same auth_user row the email sign-in
// uses, so every room, photo and decision stays theirs). Created once if the
// owner has never signed in by email on this database.
export function ownerUserId() {
  const email = adminAccess.ownerEmail();
  if (!email) return null;
  const found = rawDb.prepare('SELECT id FROM auth_user WHERE lower(email) = ?').get(email);
  if (found) return found.id;
  const id = crypto.randomUUID();
  rawDb.prepare('INSERT INTO auth_user (id, email) VALUES (?, ?) ON CONFLICT(email) DO NOTHING').run(id, email);
  return rawDb.prepare('SELECT id FROM auth_user WHERE lower(email) = ?').get(email)?.id ?? null;
}

const cookieBase = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const COOKIE_MAX_AGE_S = 180 * 24 * 60 * 60; // transport ceiling only; the session's idle deadline decides
// Both names Auth.js may have used for an older email sign-in on this browser.
const AUTH_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

// Opens the owner session on `res` for the browser that sent `jar`: reuses its
// family scope when valid, otherwise starts one. Also clears any older email
// sign-in or guest cookie, which would otherwise take precedence or linger.
// Returns false when owner entry is off or the owner cannot be resolved.
export function openOwnerSession(jar, res) {
  if (!ownerEntryEnabled()) return false;
  const subject = ownerUserId();
  if (!subject) return false;
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  let familyId = scopeRaw ? credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET) : null;
  if (!familyId || !sessions.family(familyId)) {
    familyId = sessions.bootstrap().id;
    res.cookies.set(credentials.SCOPE_COOKIE, credentials.sign('scope', familyId, process.env.AUTH_SECRET), cookieBase);
  }
  const established = sessions.owner(familyId, subject);
  res.cookies.set(credentials.OWNER_COOKIE, credentials.sign('owner', established.sessionId, process.env.AUTH_SECRET), { ...cookieBase, maxAge: COOKIE_MAX_AGE_S });
  for (const name of AUTH_COOKIES) {
    if (jar.get(name)) res.cookies.set(name, '', { ...cookieBase, secure: name.startsWith('__Secure-') || cookieBase.secure, maxAge: 0 });
  }
  if (jar.get(credentials.GUEST_COOKIE)) res.cookies.set(credentials.GUEST_COOKIE, '', { ...cookieBase, maxAge: 0 });
  return true;
}

// The owner session this browser holds, if any: { familyId, sessionId } with
// both signatures valid. Whether it is still active is up to sessions.check().
export function ownerSessionFrom(jar) {
  if (!ownerEntryEnabled()) return null;
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const ownerRaw = jar.get(credentials.OWNER_COOKIE)?.value;
  const familyId = scopeRaw ? credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET) : null;
  const sessionId = ownerRaw ? credentials.verify('owner', ownerRaw, process.env.AUTH_SECRET) : null;
  return familyId && sessionId ? { familyId, sessionId } : null;
}
