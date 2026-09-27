import { NextResponse } from 'next/server';
import { GUEST_COOKIE, createGuestToken, verifyGuestToken } from '@/lib/guestToken';
import accessTokens from '@/lib/accessToken.cjs';
import { getToken } from 'next-auth/jwt';
import privateAccess from '@/lib/privateAccess.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';

const PUBLIC_PATHS = ['/hosgeldin', '/giris', '/api/access', '/admin-giris', '/api/admin-access', '/api/health', '/giris-hatasi'];

// 6 haneli giriş kodu tahmin edilemesin: kod doğrulama isteği bağlantı başına
// sınırlı (her deneme sayılır; başarılı giriş sayacı sıfırlamaz, 15 dk sonra açılır).
const codeLimiter = attemptLimiter.createAttemptLimiter({ maxPerClient: 10, maxGlobal: 200 });

function limitCodeAttempts(req) {
  if (req.nextUrl.pathname !== '/api/auth/callback/resend') return null;
  const key = attemptLimiter.clientKey(req.headers);
  if (codeLimiter.blockedFor(key)) {
    const url = req.nextUrl.clone();
    url.pathname = '/giris-hatasi';
    url.search = '?error=TooMany';
    return NextResponse.redirect(url);
  }
  codeLimiter.fail(key);
  return null;
}

export async function proxy(req) {
  const { pathname } = req.nextUrl;
  const limited = limitCodeAttempts(req);
  if (limited) return limited;

  if (privateAccess.privateOwner()) {
    let response;
    if (pathname === '/ozel-giris' || pathname === '/api/health' || pathname === '/giris-hatasi' || pathname.startsWith('/api/auth/')) {
      response = NextResponse.next();
    } else {
      // Decode the same encrypted Auth.js JWT; never trust client-side profile data.
      const token = await getToken({ req, secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === 'production' });
      if (token?.sub && privateAccess.isAllowedEmail(token.email)) {
        response = NextResponse.next();
      } else if (pathname.startsWith('/api/')) {
        response = NextResponse.json({ error: 'private_access_required' }, { status: 401 });
      } else {
        response = NextResponse.redirect(new URL('/ozel-giris', req.url));
      }
    }
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // Erişimi zaten olan kişi karşılama/kod ekranına (ör. telefonun "geri"siyle)
  // dönerse kodu yeniden sormak yerine uygulamaya al (QA-17).
  if ((pathname === '/hosgeldin' || pathname === '/giris') &&
      accessTokens.verifyAccessToken(req.cookies.get('access_ok')?.value, 'access')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

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
  // imzali bir token olarak uretilir. Bu, 1 saatlik HAREKETSIZLIK penceresi:
  // buraya ulasan HER nitelikli istekte cookie yeniden imzalanir (rolling
  // renewal). Mevcut cookie hala gecerliyse AYNI guestId ile yenilenir (yeni
  // kimlik uretilmez); gecersizse (yok, bozuk, imza uyusmuyor, suresi gecmis)
  // yeni bir kimlik mint edilir — eski degere hicbir kosulda guvenilmez.
  // Statik dosyalar (matcher), PUBLIC_PATHS, /api/auth/* ve /admin* zaten bu
  // noktaya ulasmadan return ettigi icin bu blok yalnizca gercek uygulama
  // kullanimida calisir.
  const existingGuestId = verifyGuestToken(req.cookies.get(GUEST_COOKIE)?.value);
  const { token, expiresAt } = createGuestToken(existingGuestId || undefined);
  res.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });

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
