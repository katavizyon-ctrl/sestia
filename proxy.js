import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { GUEST_COOKIE as LEGACY_GUEST_COOKIE } from '@/lib/guestToken';
import accessTokens from '@/lib/accessToken.cjs';
import { getToken } from 'next-auth/jwt';
import privateAccess from '@/lib/privateAccess.cjs';
import attemptLimiter from '@/lib/attemptLimiter.cjs';
import { sessions } from '@/lib/db';
import credentials from '@/lib/sessionCredentials.cjs';
import adminAccess from '@/lib/adminAccess.cjs';

const PUBLIC_PATHS = ['/hosgeldin', '/giris', '/api/access', '/admin-giris', '/api/admin-access', '/api/admin-login', '/api/health', '/giris-hatasi'];

// Session V2 lifecycle endpoints the Admin panel itself uses to validate and
// renew the owner's session (app/admin/AdminSessionKeeper.js). An owner who
// signed in through /admin-giris holds no access_ok, so these three are also
// allowed for the verified owner's active session — nothing else is.
const OWNER_SESSION_PATHS = ['/api/session', '/api/session/bootstrap', '/api/session/activity'];

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

const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };

// Session V2's browser coordination scope (lib/sessionStore.cjs's
// sestia_session_families). Harmless/no-private-data — this is the ONLY
// thing proxy.js still mints unconditionally; an actual guest SESSION is
// never implicitly created here (see POST /api/session/guest).
function ensureFamilyCookie(req, res) {
  const raw = req.cookies.get(credentials.SCOPE_COOKIE)?.value;
  const existing = raw && credentials.verify('scope', raw, process.env.AUTH_SECRET);
  if (existing && sessions.family(existing)) return existing;
  const family = sessions.bootstrap();
  res.cookies.set(credentials.SCOPE_COOKIE, credentials.sign('scope', family.id, process.env.AUTH_SECRET), cookieOpts);
  return family.id;
}

// Owner-mode admin gate (lib/adminAccess.cjs): the configured owner's
// verified Auth.js JWT AND its bound Session V2 account session must be
// active — the same check the private-owner branch below uses. Reads the
// existing scope cookie only; never mints one for an admin request.
async function ownerAdminSessionOk(req) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production' });
    const raw = req.cookies.get(credentials.SCOPE_COOKIE)?.value;
    const familyId = raw && credentials.verify('scope', raw, process.env.AUTH_SECRET);
    return Boolean(token?.sub && token?.sestiaSid && familyId && adminAccess.isOwnerEmail(token.email)
      && sessions.check(token.sestiaSid, familyId).state === 'active');
  } catch {
    return false; // e.g. session policy unconfigured: fail closed
  }
}

// Hygiene only: lib/session.js never reads this legacy cookie for
// authorization, so leaving it is not a security issue by itself, but a
// stale multi-hundred-day cookie serves no purpose once Session V2 is live.
function clearLegacyGuestCookie(req, res) {
  if (req.cookies.get(LEGACY_GUEST_COOKIE)?.value) res.cookies.delete(LEGACY_GUEST_COOKIE);
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
      response = NextResponse.next();
      const familyId = ensureFamilyCookie(req, response);
      // Session V2 binding is REQUIRED here too — a cryptographically valid
      // but idle-expired/revoked JWT must not bypass the same account idle
      // policy the rest of the app enforces (no JWT-only shortcut for
      // owner-mode pages, per the implementation task's explicit instruction).
      const sessionOk = token?.sub && token?.sestiaSid && privateAccess.isAllowedEmail(token.email)
        && sessions.check(token.sestiaSid, familyId).state === 'active';
      if (!sessionOk) {
        if (pathname.startsWith('/api/')) {
          response = NextResponse.json({ error: 'private_access_required' }, { status: 401 });
        } else {
          response = NextResponse.redirect(new URL('/ozel-giris', req.url));
        }
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

  // '/admin/' covers the per-account pages; without it they would fall
  // through to the ordinary app access check below.
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')) {
    const adminOk = adminAccess.ownerMode()
      ? await ownerAdminSessionOk(req)
      : accessTokens.verifyAccessToken(req.cookies.get('admin_ok')?.value, 'admin');
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
  if (!accessOk && OWNER_SESSION_PATHS.includes(pathname) && adminAccess.ownerMode() && await ownerAdminSessionOk(req)) {
    return NextResponse.next();
  }
  if (!accessOk) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/hosgeldin';
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Session V2: proxy only ever bootstraps the no-private-data coordination
  // scope. It NEVER mints or renews a guest identity/session anymore — that
  // is now an explicit action (POST /api/session/guest) and an explicit,
  // deliberate-interaction-driven renewal (POST /api/session/activity), not
  // a side effect of "any request reached this line" (see the architecture's
  // GST-06 fix: ordinary traffic must not extend a session).
  ensureFamilyCookie(req, res);
  clearLegacyGuestCookie(req, res);

  // Sestia Kütüphanesi'nin "yeni ziyaret ile sayfa yenileme aynı şey
  // değildir" kuralı icin: expires/maxAge YOK — bu bilerek bir OTURUM
  // cookie'si (taraycı kapanınca silinir), sayfa yenilemede kalıcı. Yeni bir
  // değer SADECE cookie hiç yoksa üretilir (bkz. lib/db.js:getSestiaLibrarySelection).
  if (!req.cookies.get('sestia_visit')?.value) {
    res.cookies.set('sestia_visit', crypto.randomUUID(), cookieOpts);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|sestia/).*)'],
};
