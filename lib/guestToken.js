import crypto from 'crypto';

// Saf, Next.js baglamindan bagimsiz yardimci fonksiyonlar — hem proxy.js'te
// (guenset cookie'sini mint eder) hem lib/identity.js'te (route handler'larda
// dogrular) kullanilir. next/headers gibi sadece Route Handler/Server
// Component'lerde calisan API'lere BAGLI DEGIL, bu yuzden proxy.js'te de
// guvenle import edilebilir.

export const GUEST_COOKIE = 'guest_session';
// Misafir kimligi bir "oturum" degil, 1 saatlik HAREKETSIZLIK penceresidir:
// her nitelikli istekte proxy.js bu suреyi yeniden baslatir (bkz. proxy.js).
// Sabit bir yasam suresi degildir — surekli etkilesim suresiz devam edebilir.
const GUEST_MAX_AGE_MS = 60 * 60 * 1000; // 1 saat, hareketsizlikle yenilenir

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET tanimli degil');
  return s;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// existingGuestId verilirse (ve gecerli bir UUID ise) AYNI kimlikle
// yenilenir — yeni bir misafir ID uretilmez. Bu, halen aktif olan bir
// misafirin donem sinirinin (1 saat) her nitelikli istekte ileri
// kaydirilmasini saglar (proxy.js), degerinden BAGIMSIZ olarak cagirana
// (var olan tum cagrilar argumansiz, "yeni misafir" davranisini korur).
export function createGuestToken(existingGuestId) {
  const guestId = (typeof existingGuestId === 'string' && UUID_RE.test(existingGuestId))
    ? existingGuestId
    : crypto.randomUUID();
  const expires = Date.now() + GUEST_MAX_AGE_MS;
  const payload = `${guestId}.${expires}`;
  return { guestId, token: `${payload}.${sign(payload)}`, expiresAt: new Date(expires) };
}

// Cookie degeri gecerli degilse (eksik, bozuk, imza uyusmuyor, suresi
// gecmis) HER ZAMAN null doner — hicbir kosulda cookie'nin kendisine
// "var oldugu icin" guvenilmez, imza her seferinde yeniden hesaplanip
// sabit-zamanli karsilastirilir.
export function verifyGuestToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [guestId, expiresStr, sig] = parts;
  if (!UUID_RE.test(guestId)) return null;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const expected = sign(`${guestId}.${expiresStr}`);
  let expectedBuf, givenBuf;
  try {
    expectedBuf = Buffer.from(expected, 'hex');
    givenBuf = Buffer.from(sig, 'hex');
  } catch {
    return null;
  }
  if (expectedBuf.length !== givenBuf.length) return null;
  if (!crypto.timingSafeEqual(expectedBuf, givenBuf)) return null;

  return guestId;
}
