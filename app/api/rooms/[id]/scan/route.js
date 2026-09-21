import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { saveRoomScan, saveRoomAnalysis, clearRoomScan } from '@/lib/db';
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

  const analysisOk = saveRoomAnalysis(roomId, identity.id, sessionKey, items, messages, photoIds);
  if (!analysisOk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const scanOk = saveRoomScan(roomId, identity.id, items, messages);
  if (!scanOk) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// Kararlar onaylandiktan sonra (ya da kullanici acikca vazgectiginde)
// bekleyen taramayi temizler — artik gercek 'decisions' satirlarina
// "mezun olmus" demektir, kopya/eski veri olarak kalmasin.
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
  clearRoomScan(roomId, identity.id);
  return NextResponse.json({ ok: true });
}
