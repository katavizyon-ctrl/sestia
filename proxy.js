import { NextResponse } from 'next/server';
import { GUEST_COOKIE, createGuestToken, verifyGuestToken } from '@/lib/guestToken';
import accessTokens from '@/lib/accessToken.cjs';

const PUBLIC_PATHS = ['/hosgeldin', '/giris', '/api/access', '/admin-giris', '/api/admin-access', '/api/health'];

export function proxy(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // Auth.js'in kendi rotalari (dogrulama linki, oturum, csrf...) ortak test
  // ACCESS_CODE kapisinin disinda tutulmali. En kritik neden: dogrulama
  // linki kullanicinin e-postasindan, hic access_ok cookie'si olmayan
  // BASKA bir cihaz/tarayicida acilabilir — orada erisim kapisina takilirsa
  // giris tamamlanamaz.
  if (pathname.startsWith('/api/auth/')) return NextResponse.next();

  if (pathname === '/admin' || pathname.startsWith('/api/admin')) {
    const adminOk = accessTokens.verifyAccessToken(req.cookies.get('admin_ok')?.value, 'admin');
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

  const accessOk = accessTokens.verifyAccessToken(req.cookies.get('access_ok')?.value, 'access');
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

  // Sestia Kütüphanesi'nin "yeni ziyaret ile sayfa yenileme aynı şey
  // değildir" kuralı icin: expires/maxAge YOK — bu bilerek bir OTURUM
  // cookie'si (taraycı kapanınca silinir), sayfa yenilemede kalıcı. Yeni bir
  // değer SADECE cookie hiç yoksa üretilir (bkz. lib/db.js:getSestiaLibrarySelection).
  if (!req.cookies.get('sestia_visit')?.value) {
    res.cookies.set('sestia_visit', crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|sestia/).*)'],
};
