import { NextResponse } from 'next/server';
import { getState, getHomeMessage } from '@/lib/db';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

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
  // identityType + identityId: client'in "kullanici secim ekranini tekrar
  // gostermeme" kararini SADECE gecerli, tanidik bir kimlige gore verebilmesi
  // icin (bkz. app/page.js — localStorage bayragi tek basina yeterli degil,
  // cunku sunucu tarafi misafir kimligi sessizce degismis/sifirlanmis olabilir).
  return NextResponse.json({ ...state, homeMessage, identityType: identity.type, identityId: identity.id });
}
