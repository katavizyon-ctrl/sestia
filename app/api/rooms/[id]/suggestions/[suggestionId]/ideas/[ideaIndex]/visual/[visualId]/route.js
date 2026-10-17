import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getIdentity } from '@/lib/identity';
import { roomSuggestions } from '@/lib/db';

export const runtime = 'nodejs';

const VISUALS_DIR = path.join(process.cwd(), 'data', 'idea-visuals');

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// Same principle as the Toparla result route: a device mismatch or an
// unfinished visual never touches the filesystem.
export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });

  const { suggestionId, visualId } = await params;
  const visual = roomSuggestions.getVisualFile(Number(visualId), identity.id);
  if (!visual || visual.suggestionId !== Number(suggestionId)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

  const bytes = await fs.readFile(path.join(VISUALS_DIR, visual.filename)).catch(() => null);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

  return new NextResponse(bytes, { headers: { 'Content-Type': visual.mimeType, 'Cache-Control': 'private, no-store' } });
}
