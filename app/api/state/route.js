import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import rawDb, { getState, getHomeMessage, getSestiaLibrarySelection, hasStartedRealWork } from '@/lib/db';
import { getIdentity } from '@/lib/identity';
import { isEmailReady } from '@/lib/auth';
import { authUser } from '@/lib/authSchema';
import privateAccess from '@/lib/privateAccess.cjs';
import { ownerEntryEnabled } from '@/lib/ownerEntry';

export const runtime = 'nodejs';

const drizzleDb = drizzle(rawDb);

// GUVENLIK PILOTU: bu rota artik client'in gonderdigi deviceId'ye guvenmiyor.
// Kimlik sadece sunucuda dogrulanmis oturum/misafir cookie'sinden cozuluyor
// (bkz. lib/identity.js). Eksik/gecersiz kimlikte guvensiz bir eski-yontem
// fallback YOK — direkt 401.
export async function GET() {
  const identity = await getIdentity();
  if (!identity) {
    // E-postayla giriş zorunluysa istemci hata ekranı yerine giriş ekranını göstersin.
    if (privateAccess.emailRequired()) {
      return NextResponse.json({ error: 'sign_in_required', emailReady: isEmailReady() }, { status: 401 });
    }
    // Session V2: no active guest/account session yet (never established,
    // idle-expired, or revoked) — distinct from a real connectivity/auth
    // failure so the client shows guest/account entry, not a generic error.
    // ownerEntry: the client sends the owner back to the access-code screen,
    // which signs them in again (lib/ownerEntry.js).
    return NextResponse.json({ error: 'session_required', emailReady: isEmailReady(), ownerEntry: ownerEntryEnabled() }, { status: 401 });
  }
  const state = getState(identity.id);
  const homeMessage = getHomeMessage(identity.id);
  // Kesif/aktif-kullanici ayrimi: totalDecisions===0 TEK basina yeterli
  // degil — oda olusturmus/fotograf yuklemis/analiz yaptirmis ama henuz
  // karar vermemis biri de "gercek calismasi olan" sayilir (bkz. lib/db.js
  // hasStartedRealWork, gorev brief'i Bolum 7).
  const hasStartedWork = hasStartedRealWork(identity.id);
  // proxy.js'in mint ettigi oturum-omurlu cookie — Kesif ekraninin "ayni
  // ziyarette ayni secim" kuralini uygulayabilmesi icin (bkz. lib/db.js).
  const visitToken = (await cookies()).get('sestia_visit')?.value || null;
  const sestiaLibrary = !hasStartedWork ? getSestiaLibrarySelection(identity.id, visitToken) : null;

  // Isim kaynagi kimlik turune gore FARKLI: misafir icin isim istemcide
  // (localStorage) tutulur, burada hic bilinmez — bu yuzden sadece hesapli
  // kullanicida dolduruluyor. Hesapli kullanicida KESINLIKLE auth_user'dan
  // okunuyor (localStorage/JWT'ye guvenilmiyor) ki isim hangi cihazdan
  // baglanirsa baglansin ayni olsun.
  let name = null;
  if (identity.type === 'account') {
    const row = await drizzleDb.select({ name: authUser.name }).from(authUser).where(eq(authUser.id, identity.id)).get();
    name = row?.name || null;
  }

  // identityType + identityId: client'in "kullanici secim ekranini tekrar
  // gostermeme" kararini SADECE gecerli, tanidik bir kimlige gore verebilmesi
  // icin (bkz. app/page.js — localStorage bayragi tek basina yeterli degil,
  // cunku sunucu tarafi misafir kimligi sessizce degismis/sifirlanmis olabilir).
  return NextResponse.json({
    ...state,
    homeMessage,
    sestiaLibrary,
    hasStartedWork,
    identityType: identity.type,
    identityId: identity.id,
    emailReady: isEmailReady(),
    name,
  });
}
