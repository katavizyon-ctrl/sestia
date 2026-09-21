import { NextResponse } from 'next/server';
import { GUEST_COOKIE, createGuestToken, verifyGuestToken } from '@/lib/guestToken';

const PUBLIC_PATHS = ['/hosgeldin', '/giris', '/api/access', '/admin-giris', '/api/admin-access'];

export function proxy(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (pathname === '/admin' || pathname.startsWith('/api/admin')) {
    const adminOk = req.cookies.get('admin_ok')?.value === '1';
    if (!adminOk) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/admin-giris';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const accessOk = req.cookies.get('access_ok')?.value === '1';
  if (!accessOk) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/hosgeldin';
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Misafir kimligi client'in belirledigi bir sey degil: burada, sunucuda,
  // imzali bir token olarak uretilir. Mevcut cookie gecersizse (yok, bozuk,
  // imza uyusmuyor, suresi gecmis) HER ZAMAN yenisi mint edilir — asla eski
  // degere guvenilmez.
  if (!verifyGuestToken(req.cookies.get(GUEST_COOKIE)?.value)) {
    const { token, expiresAt } = createGuestToken();
    res.cookies.set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/',
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg).*)'],
};
