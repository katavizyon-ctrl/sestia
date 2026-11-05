import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getIdentity } from '@/lib/identity';
import { getRoomPhotoFile, deleteRoomPhoto } from '@/lib/db';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');
const NO_STORE = { 'Cache-Control': 'private, no-store' };

// "Fotoğrafı sil": only the owner, only under its own room. The database row
// goes first; a file that is already missing on disk is not an error.
export async function DELETE(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, photoId } = await params;
  const deleted = deleteRoomPhoto(Number(id), Number(photoId), identity.id);
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await fs.unlink(path.join(PHOTOS_DIR, deleted.filename)).catch((error) => {
    if (error?.code !== 'ENOENT') console.error('room_photo_file_delete_failed', { photoId: deleted.id, code: error?.code });
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  }
  const { photoId } = await params;
  const id = Number(photoId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'invalid_photo' }, { status: 400, headers: NO_STORE });
  }
  // device_id eslesmezse (baskasinin fotografi) sorgu null doner — dosya
  // sistemine hic dokunulmuyor.
  const photo = getRoomPhotoFile(id, identity.id);
  if (!photo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  }
  const bytes = await fs.readFile(path.join(PHOTOS_DIR, photo.filename)).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  }
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': photo.mimeType,
      'Cache-Control': 'private, no-store',
    },
  });
}
