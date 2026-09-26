import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getIdentity } from '@/lib/identity';
import { chatAttachments } from '@/lib/db';

export const runtime = 'nodejs';

const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'chat-attachments');

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { attachmentId } = await params;
  const id = Number(attachmentId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'invalid_attachment' }, { status: 400 });

  // device_id mismatch -> null, filesystem never touched — same principle as
  // the room-photo and Toparla-result routes.
  const attachment = chatAttachments.getOwned(id, identity.id);
  if (!attachment) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const bytes = await fs.readFile(path.join(ATTACHMENTS_DIR, attachment.filename)).catch(() => null);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': attachment.mimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
