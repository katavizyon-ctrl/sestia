import { NextResponse, NextRequest } from 'next/server';
import { handlers } from '@/lib/auth';
import adminAccess from '@/lib/adminAccess.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';

export const runtime = 'nodejs';

// Every attempt counts, like the proxy's limit on /api/auth/callback/resend:
// a 6-digit code must not be guessable through this route either.
const limiter = attemptLimiter.createAttemptLimiter({ maxPerClient: 10, maxGlobal: 100 });

function redirectTo(path, authResponse) {
  const res = new NextResponse(null, { status: 303, headers: { Location: path } });
  for (const cookie of authResponse?.headers.getSetCookie() ?? []) res.headers.append('Set-Cookie', cookie);
  return res;
}

// The 6-digit code from /admin-giris. Runs Auth.js's own email callback on
// the server with ADMIN_OWNER_EMAIL filled in here — the browser never holds
// the address and no redirect contains it. Success lands on /admin; a wrong,
// expired or used code returns to /admin-giris, never to the user flow.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  if (!adminAccess.ownerMode()) return NextResponse.json({ error: 'not_available' }, { status: 404 });
  const key = attemptLimiter.clientKey(req.headers);
  if (limiter.blockedFor(key)) return redirectTo('/admin-giris?hata=cok-fazla');
  limiter.fail(key);

  const form = await req.formData().catch(() => null);
  const code = (form?.get('code') || '').toString().trim();
  if (!/^\d{6}$/.test(code)) return redirectTo('/admin-giris?hata=kod');

  const url = new URL('/api/auth/callback/resend', req.url);
  url.search = new URLSearchParams({ token: code, email: adminAccess.ownerEmail(), callbackUrl: '/admin' }).toString();
  let authResponse;
  try {
    authResponse = await handlers.GET(new NextRequest(url, { headers: req.headers }));
  } catch {
    return redirectTo('/admin-giris?hata=kod');
  }
  const location = authResponse.headers.get('location');
  const target = location ? new URL(location, 'https://admin-login.invalid') : null;
  const ok = target && target.pathname === '/admin' && !target.searchParams.get('error');
  return redirectTo(ok ? '/admin' : '/admin-giris?hata=kod', authResponse);
}
