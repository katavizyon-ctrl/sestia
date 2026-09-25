import { NextResponse } from 'next/server';
import accessTokens from '@/lib/accessToken.cjs';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = (body.code || '').toString();
  const expected = process.env.ADMIN_ACCESS_CODE;

  if (!expected) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }
  if (code !== expected) {
    return NextResponse.json({ error: 'wrong_code' }, { status: 401 });
  }

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
