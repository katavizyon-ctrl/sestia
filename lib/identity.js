import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { GUEST_COOKIE, verifyGuestToken } from '@/lib/guestToken';
import privateAccess from '@/lib/privateAccess.cjs';

// Route Handler'larin kullanmasi gereken TEK kimlik kaynagi. Client'tan
// gelen hicbir deviceId/kullanici id'sine bakilmaz.
//
// 1) Once gecerli bir Auth.js oturumu denenir — auth() kendi JWT'sini
//    AUTH_SECRET ile kriptografik olarak dogrular (sadece cookie'nin var
//    olup olmadigina degil, imzasina ve suresine bakar).
// 2) Yoksa proxy.js'in mint ettigi imzali misafir cookie'si okunup
//    verifyGuestToken() ile dogrulanir (ayni sekilde: var olmasi yetmez,
//    imza+sure kontrol edilir).
// 3) Hicbiri gecerli degilse null doner — cagiran route bunu 401 olarak
//    ele almali, ASLA eski deviceId parametresine geri dusmemeli.
export async function getIdentity() {
  const session = await auth();
  if (session?.user?.id) {
    if (!privateAccess.isAllowedEmail(session.user.email)) return null;
    return { id: session.user.id, type: 'account' };
  }
  if (privateAccess.emailRequired()) return null;

  const jar = await cookies();
  const guestId = verifyGuestToken(jar.get(GUEST_COOKIE)?.value);
  if (guestId) {
    return { id: guestId, type: 'guest' };
  }

  return null;
}

// Paid/account-only capabilities (Toparla) share this one check — the actual
// authorization primitive is just identity.type, already produced above by
// the same source of truth every route uses. Never trust a client-asserted
// flag; identity always comes from getIdentity().
export function isAccountIdentity(identity) {
  return identity?.type === 'account';
}
