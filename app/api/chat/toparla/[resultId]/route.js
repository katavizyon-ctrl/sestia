import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getIdentity } from '@/lib/identity';
import { toparla } from '@/lib/db';

export const runtime = 'nodejs';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'toparla-results');

// Room-less equivalent of app/api/rooms/[id]/toparla/[resultId]/route.js —
// that route's own [id] (roomId) segment is never actually used for
// lookup (getResultFile is keyed on resultId+device_id alone), so a
// chat-originated, room-less result needs a path that doesn't require a
// roomId at all. Same private, ownership-checked lookup either way.
export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { resultId } = await params;
  const id = Number(resultId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'invalid_result' }, { status: 400 });

  // device_id mismatch (or not yet completed) -> null, filesystem untouched —
  // same principle as the room-photo and room-based Toparla routes.
  const result = toparla.getResultFile(id, identity.id);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const bytes = await fs.readFile(path.join(RESULTS_DIR, result.filename)).catch(() => null);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
