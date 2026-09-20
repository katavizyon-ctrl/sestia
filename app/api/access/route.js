import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = (body.code || '').toString();
  const expected = process.env.ACCESS_CODE;

  if (!expected) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }
  if (code !== expected) {
    return NextResponse.json({ error: 'wrong_code' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('access_ok', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 180,
    path: '/',
  });
  return res;
}
