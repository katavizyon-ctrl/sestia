import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sessions } from '@/lib/db';
import credentials from '@/lib/sessionCredentials.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';

export const runtime = 'nodejs';
const INTENT_COOKIE_MAX_AGE_S = 15 * 60; // matches the email code's own 15-minute validity

// Binds an explicit email-login attempt to the current browser family
// revision, BEFORE the actual Auth.js signIn() call is made (called from
// WelcomeView.submitEmail). Never renews or creates a session by itself —
// lib/auth.js's verified-callback-only jwt() handler consumes this later.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  const jar = await cookies();
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const familyId = scopeRaw && credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET);
  if (!familyId) return NextResponse.json({ error: 'session_required' }, { status: 401 });

  const family = sessions.family(familyId);
  if (!family) return NextResponse.json({ error: 'session_required' }, { status: 401 });

  const intent = crypto.randomUUID();
  try {
    sessions.loginIntent(familyId, family.revision, intent);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'login_intent_failed' }, { status: error?.status || 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(credentials.INTENT_COOKIE, credentials.sign('intent', intent, process.env.AUTH_SECRET), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: INTENT_COOKIE_MAX_AGE_S,
  });
  return res;
}
