import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { saveRoomScan, clearRoomScan } from '@/lib/db';
import { validRoomItems, validRoomScanMessages } from '@/lib/anthropic';

export const runtime = 'nodejs';

// Odanin "tamamlanmis ama henuz karara baglanmamis" analizini kaydeder —
// kullanici hic karar vermeden cikip donse bile burada bulunur. roomId'nin
// GERCEKTEN bu kimlige ait oldugu saveRoomScan icinde ayrica dogrulanir.
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
  if (items.length > 0 && !validRoomItems(items)) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }
  if (messages.length > 0 && !validRoomScanMessages(messages, 12000)) {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 });
  }

  const ok = saveRoomScan(roomId, identity.id, items, messages);
  if (!ok) {
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
