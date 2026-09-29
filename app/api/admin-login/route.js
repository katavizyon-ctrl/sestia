import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sessions } from '@/lib/db';
import { signIn } from '@/lib/auth';
import credentials from '@/lib/sessionCredentials.cjs';
import adminAccess from '@/lib/adminAccess.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';

export const runtime = 'nodejs';

const limiter = attemptLimiter.createAttemptLimiter({ maxPerClient: 10, maxGlobal: 60 });
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const INTENT_MAX_AGE_S = 15 * 60; // the email code's own validity

// Relative on purpose: behind Railway a route's req.url carries the internal origin.
function back(query) {
  return new NextResponse(null, { status: 303, headers: { Location: `/admin-giris?${query}` } });
}

// "Giriş kodu gönder" on /admin-giris (owner mode only). Sets up the two
// Session V2 prerequisites the normal login gets from the app — browser scope
// and a login intent — then asks Auth.js itself to email the existing 6-digit
// code to ADMIN_OWNER_EMAIL. The address is only ever read here on the
// server: the request carries no email, and no response, redirect or error
// names it. access_ok is never set.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  if (!adminAccess.ownerMode()) return NextResponse.json({ error: 'not_available' }, { status: 404 });
  const key = attemptLimiter.clientKey(req.headers);
  if (limiter.blockedFor(key)) return back('hata=cok-fazla');
  limiter.fail(key); // every request counts, successful or not

  const jar = await cookies();
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const existing = scopeRaw && credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET);
  let family = existing ? sessions.family(existing) : null;
  const newFamily = !family;
  if (newFamily) family = sessions.bootstrap();
  const intent = crypto.randomUUID();
  try {
    sessions.loginIntent(family.id, family.revision, intent);
  } catch {
    return back('hata=gonderilemedi');
  }
  // Set before signIn(): the prerequisites belong to this browser whether or
  // not the email succeeds; they only matter together with the emailed code.
  if (newFamily) jar.set(credentials.SCOPE_COOKIE, credentials.sign('scope', family.id, process.env.AUTH_SECRET), cookieOpts);
  jar.set(credentials.INTENT_COOKIE, credentials.sign('intent', intent, process.env.AUTH_SECRET), { ...cookieOpts, maxAge: INTENT_MAX_AGE_S });
  jar.set(adminAccess.ADMIN_LOGIN_COOKIE, adminAccess.signAdminLogin(intent), { ...cookieOpts, maxAge: INTENT_MAX_AGE_S });

  try {
    // Auth.js's own server-side sign-in: same Resend provider, same code.
    const url = await signIn('resend', { email: adminAccess.ownerEmail(), redirect: false, redirectTo: '/admin' });
    if (new URL(url, 'https://admin-login.invalid').searchParams.get('error')) return back('hata=gonderilemedi');
  } catch {
    return back('hata=gonderilemedi'); // never echo the provider error: it may name the recipient
  }
  return back('adim=kod');
}
