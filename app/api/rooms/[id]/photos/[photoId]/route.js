import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getIdentity } from '@/lib/identity';
import { getRoomPhotoFile } from '@/lib/db';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { photoId } = await params;
  const id = Number(photoId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'invalid_photo' }, { status: 400 });
  }
  // device_id eslesmezse (baskasinin fotografi) sorgu null doner — dosya
  // sistemine hic dokunulmuyor.
  const photo = getRoomPhotoFile(id, identity.id);
  if (!photo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const bytes = await fs.readFile(path.join(PHOTOS_DIR, photo.filename)).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': photo.mimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
