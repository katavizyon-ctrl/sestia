import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { createRoom, getRoomsForDevice } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ rooms: getRoomsForDevice(identity.id) });
}

export async function POST(req) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body?.name || '').toString().trim().slice(0, 60);
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  const room = createRoom(identity.id, name);
  return NextResponse.json(room);
}
