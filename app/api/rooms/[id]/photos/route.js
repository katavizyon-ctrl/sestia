import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getIdentity } from '@/lib/identity';
import { addRoomPhoto } from '@/lib/db';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');
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

  // Dosya adi HIC bir zaman client'tan gelmiyor — rastgele uretiliyor, path
  // traversal / cakisma riski yok.
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // addRoomPhoto sahipligi (bu oda GERCEKTEN bu kimlige mi ait) kendi
  // icinde kontrol ediyor — dosyayi ONCE diske yazip SONRA sahiplik
  // basarisizsa siliyoruz, boylece bosuna bir dosya yazma/silme sirasi
  // ownership kontrolunun onune gecmiyor.
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  await fs.writeFile(path.join(PHOTOS_DIR, filename), buffer);

  const photo = addRoomPhoto(roomId, identity.id, filename, file.type);
  if (!photo) {
    await fs.unlink(path.join(PHOTOS_DIR, filename)).catch(() => {});
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(photo);
}
