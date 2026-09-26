import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getIdentity } from '@/lib/identity';
import { chatAttachments } from '@/lib/db';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

export const runtime = 'nodejs';

// Deliberately separate from data/room-photos: an image attached to a chat
// message does not yet belong to any room, and never silently becomes a
// room photo — that stays a distinct, explicit future user action.
const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'chat-attachments');
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('photo');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'photo_required' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  // Server-generated filename only — the client's own filename is never
  // trusted or stored.
  const filename = `chat-${crypto.randomUUID()}.${ext}`;
  try {
    await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });
    await fs.writeFile(path.join(ATTACHMENTS_DIR, filename), buffer);
  } catch (error) {
    console.error('chat_attachment_write_failed', { code: error?.code });
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }
  const result = chatAttachments.create(identity.id, filename, file.type);
  return NextResponse.json(result);
}
