import { NextResponse } from 'next/server';
import accessTokens from '@/lib/accessToken.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';

export const runtime = 'nodejs';

const limiter = attemptLimiter.createAttemptLimiter();

export async function POST(req) {
  // Yerel gelistirmede (next dev -> NODE_ENV='development') paylasimli
  // erisim kodu adimi atlaniyor — landing page'deki "Hadi Başlayalım"
  // bu rotayi bos bir kodla cagiriyor. Bu blok SADECE NODE_ENV
  // 'production' DEGILKEN calisir; gercek production build'inde
  // (next build/next start -> NODE_ENV='production') asagidaki kod
  // dogrulamasi HER ZAMAN, degismeden calisir.
  const isLocalDev = process.env.NODE_ENV !== 'production';
  if (!isLocalDev) {
    const body = await req.json().catch(() => ({}));
    const code = (body.code || '').toString();
    const expected = process.env.ACCESS_CODE;

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
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('access_ok', accessTokens.createAccessToken('access'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 180,
    path: '/',
  });
  return res;
}
