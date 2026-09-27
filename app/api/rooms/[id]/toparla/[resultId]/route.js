import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getIdentity } from '@/lib/identity';
import { toparla } from '@/lib/db';

export const runtime = 'nodejs';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'toparla-results');

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });

  const { resultId } = await params;
  const id = Number(resultId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'invalid_result' }, { status: 400, headers: NO_STORE });

  // device_id mismatch (or not yet completed) -> null, filesystem untouched —
  // same principle as the room-photo route.
  const result = toparla.getResultFile(id, identity.id);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

  const bytes = await fs.readFile(path.join(RESULTS_DIR, result.filename)).catch(() => null);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'private, no-store',
    },
  });
}
