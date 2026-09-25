import { NextResponse } from 'next/server';
import accessTokens from '@/lib/accessToken.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';

export const runtime = 'nodejs';

const limiter = attemptLimiter.createAttemptLimiter({ maxPerClient: 5, maxGlobal: 30 });

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = (body.code || '').toString();
  const expected = process.env.ADMIN_ACCESS_CODE;

  if (!expected) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }
  const key = attemptLimiter.clientKey(req.headers);
  const wait = limiter.blockedFor(key);
  if (wait) {
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429, headers: { 'Retry-After': String(wait) } });
  }
  if (!attemptLimiter.codesMatch(code, expected)) {
    limiter.fail(key);
    return NextResponse.json({ error: 'wrong_code' }, { status: 401 });
  }
  limiter.succeed(key);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_ok', accessTokens.createAccessToken('admin'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
