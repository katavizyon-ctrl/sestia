import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { getRoomDetail, updateRoomBrief, ROOM_BRIEF_LIMITS } from '@/lib/db';

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

// "Bu oda ne olacak?" — the room's goal, optional story and the user's
// corrections to what Sestia saw. Only the fields sent are changed; empty text
// clears a field; anything that is not a string (or is too long) is rejected
// rather than silently cut.
export async function PATCH(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const roomId = Number((await params).id);
  if (!Number.isInteger(roomId)) return NextResponse.json({ error: 'invalid_room' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const keys = Object.keys(ROOM_BRIEF_LIMITS);
  if (!body || typeof body !== 'object' || !keys.some((key) => body[key] !== undefined) ||
      keys.some((key) => body[key] !== undefined && !(body[key] === null || (typeof body[key] === 'string' && body[key].length <= ROOM_BRIEF_LIMITS[key])))) {
    return NextResponse.json({ error: 'invalid_goal' }, { status: 400 });
  }
  const saved = updateRoomBrief(roomId, identity.id, Object.fromEntries(keys.map((key) => [key, body[key] === null ? '' : body[key]])));
  if (!saved) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(saved);
}
