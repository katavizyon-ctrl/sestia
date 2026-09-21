import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import rawDb, { getState, getHomeMessage } from '@/lib/db';
import { getIdentity } from '@/lib/identity';
import { isEmailReady } from '@/lib/auth';
import { authUser } from '@/lib/authSchema';

export const runtime = 'nodejs';

const drizzleDb = drizzle(rawDb);

// GUVENLIK PILOTU: bu rota artik client'in gonderdigi deviceId'ye guvenmiyor.
// Kimlik sadece sunucuda dogrulanmis oturum/misafir cookie'sinden cozuluyor
// (bkz. lib/identity.js). Eksik/gecersiz kimlikte guvensiz bir eski-yontem
// fallback YOK — direkt 401.
export async function GET() {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const state = getState(identity.id);
  const homeMessage = getHomeMessage(identity.id);

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
    identityType: identity.type,
    identityId: identity.id,
    emailReady: isEmailReady(),
    name,
  });
}
