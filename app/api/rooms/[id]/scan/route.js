import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { saveRoomScan, saveRoomAnalysis, finalizeRoomAnalysis, getRoomScan, clearRoomScan } from '@/lib/db';
import { validRoomItems, validRoomScanMessages } from '@/lib/anthropic';

export const runtime = 'nodejs';

const SESSION_KEY_RE = /^[A-Za-z0-9-]{8,100}$/;

// Iki adim, BU SIRAYLA: once kalici analiz (room_analyses) yazilir, o
// basarili olmadan aktif oturum aynasi (room_scans) HICBIR ZAMAN
// guncellenmez. Boylece room_scans, karsiliginda kalici bir kayit
// olmayan bir icerigi asla yansitamaz — kalici kayit basarisiz olursa
// istemci acik bir hata alir, aktif oturum sessizce "ilerlemis" gibi
// gorunmez (bkz. PLAN: kalici kayit yoksa aktif oturum temizlenemez/var
// olamaz gereksinimi).
export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const roomId = Number(id);
  if (!Number.isInteger(roomId)) {
    return NextResponse.json({ error: 'invalid_room' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const photoIds = Array.isArray(body?.photoIds) ? body.photoIds : [];
  const sessionKey = typeof body?.sessionKey === 'string' && SESSION_KEY_RE.test(body.sessionKey) ? body.sessionKey : null;
  if (!sessionKey) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  }
  if (items.length > 0 && !validRoomItems(items)) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }
  if (messages.length > 0 && !validRoomScanMessages(messages, 12000)) {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
  }

  const analysisId = saveRoomAnalysis(roomId, identity.id, sessionKey, items, messages, photoIds);
  if (!analysisId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const scanOk = saveRoomScan(roomId, identity.id, items, messages, analysisId);
  if (!scanOk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Kararlar onaylandiktan sonra (ya da kullanici acikca vazgectiginde)
// bekleyen taramayi temizler — artik gercek 'decisions' satirlarina
// "mezun olmus" demektir, kopya/eski veri olarak kalmasin.
//
// Istege bagli finalItems govdesi: kullanicinin manuel degisiklikleri
// (hariç tutma/oneri degistirme) sonucundaki NIHAI durumu, aktif oturumun
// baglandigi kalici room_analyses satirina (room_scans.analysis_id —
// silinmeden HEMEN once okunur) ayri bir sutuna yazar. Bu, Sestia'nin
// orijinal degerlendirmesini (items_json) HIC degistirmez — ikisi gecmis
// goruntulenirken ayri ayri gosterilir. En iyi caba: basarisiz olursa
// (ör. gecersiz finalItems) karar zaten /api/decide'da kaydedilmis
// oldugundan sessizce atlanir, aktif oturum yine de temizlenir.
export async function DELETE(req, { params }) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const roomId = Number(id);
  if (!Number.isInteger(roomId)) {
    return NextResponse.json({ error: 'invalid_room' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const finalItems = Array.isArray(body?.finalItems) ? body.finalItems : null;
  if (finalItems && validRoomItems(finalItems)) {
    const scan = getRoomScan(roomId, identity.id);
    if (scan?.analysisId) {
      finalizeRoomAnalysis(scan.analysisId, roomId, identity.id, finalItems);
    }
  }

  clearRoomScan(roomId, identity.id);
  return NextResponse.json({ ok: true });
}
