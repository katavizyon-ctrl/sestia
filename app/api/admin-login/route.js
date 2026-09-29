import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sessions } from '@/lib/db';
import credentials from '@/lib/sessionCredentials.cjs';
import adminAccess from '@/lib/adminAccess.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';

export const runtime = 'nodejs';

const limiter = attemptLimiter.createAttemptLimiter({ maxPerClient: 10, maxGlobal: 60 });
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const INTENT_MAX_AGE_S = 15 * 60; // the email code's own validity

// Owner-only Admin login preparation (/admin-giris). Establishes exactly the
// two Session V2 prerequisites the normal login gets from the app —
// the no-private-data browser scope and a login intent — so the existing
// Auth.js email code can bind a Session V2 account session and return to
// /admin, without the invite gate or user onboarding. It never sets
// access_ok, never sends email itself (the client then uses Auth.js's own
// /api/auth/signin/resend), and refuses any address but ADMIN_OWNER_EMAIL.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  if (!adminAccess.ownerMode()) return NextResponse.json({ error: 'not_available' }, { status: 404 });
  const key = attemptLimiter.clientKey(req.headers);
  const wait = limiter.blockedFor(key);
  if (wait) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429, headers: { 'Retry-After': String(wait) } });
  limiter.fail(key); // every request counts, successful or not

  const body = await req.json().catch(() => ({}));
  const email = (body?.email || '').toString().normalize('NFKC').trim().toLowerCase();
  if (!adminAccess.isOwnerEmail(email)) return NextResponse.json({ error: 'not_admin_owner' }, { status: 403 });

  const jar = await cookies();
  const res = NextResponse.json({ ok: true });
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const existing = scopeRaw && credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET);
  let family = existing ? sessions.family(existing) : null;
  if (!family) {
    family = sessions.bootstrap();
    res.cookies.set(credentials.SCOPE_COOKIE, credentials.sign('scope', family.id, process.env.AUTH_SECRET), cookieOpts);
  }
  const intent = crypto.randomUUID();
  try {
    sessions.loginIntent(family.id, family.revision, intent);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'login_intent_failed' }, { status: error?.status || 500 });
  }
  res.cookies.set(credentials.INTENT_COOKIE, credentials.sign('intent', intent, process.env.AUTH_SECRET), { ...cookieOpts, maxAge: INTENT_MAX_AGE_S });
  res.cookies.set(adminAccess.ADMIN_LOGIN_COOKIE, adminAccess.signAdminLogin(intent), { ...cookieOpts, maxAge: INTENT_MAX_AGE_S });
  return res;
}
