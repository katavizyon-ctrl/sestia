import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { getRoomDetail } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const roomId = Number(id);
  if (!Number.isInteger(roomId)) {
    return NextResponse.json({ error: 'invalid_room' }, { status: 400 });
  }
  // getRoomDetail device_id'yi de sorguya dahil ediyor — baskasina ait bir
  // odanin var olup olmadigi bile sizdirilmiyor, direkt 404.
  const room = getRoomDetail(roomId, identity.id);
  if (!room) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(room);
}
