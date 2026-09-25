import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { creations } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_BYTES = 20 * 1024 * 1024;
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

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

  const formData = await req.formData();
  const file = formData.get('photo');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'photo_required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  }
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    return NextResponse.json(creations.photo(identity.id, roomId, formData.get('operationKey'), buffer, file.type, formData.get('sessionKey') || null));
  } catch (error) {
    if (!error.status) console.error('room_photo_failed', { roomId, code: error.code });
    return NextResponse.json({ error: error.status ? error.message : 'upload_failed' }, { status: error.status || 500 });
  }
}
