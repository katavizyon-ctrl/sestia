import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getIdentity } from '@/lib/identity';
import { getRedesignInput, saveRoomRedesign, logEvent } from '@/lib/db';
import { redesignRoom, MAX_REDESIGN_PHOTOS, MAX_SUGGESTION_IMAGE_BYTES } from '@/lib/anthropic';
import roomRedesign from '@/lib/roomRedesign.cjs';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');
const NO_STORE = { 'Cache-Control': 'no-store' };

// "Odayı yeniden yap": one AI call (plus at most one repair) per explicit tap,
// on a room this identity owns that has a saved plan. Everything — plan,
// photos, goal — is read server-side from the owned room; the request carries
// nothing but the room id.
export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });

  const { id } = await params;
  if (!/^[1-9]\d{0,15}$/.test(id)) return NextResponse.json({ error: 'invalid_room' }, { status: 400, headers: NO_STORE });
  const roomId = Number(id);

  const input = getRedesignInput(roomId, identity.id);
  if (!input) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  if (!input.plan) return NextResponse.json({ error: 'plan_required' }, { status: 409, headers: NO_STORE });
  if (!input.photos.length) return NextResponse.json({ error: 'photos_required' }, { status: 409, headers: NO_STORE });

  // Photos placed on the plan first (their position tells where things are),
  // then the rest, up to the limit. Numbers follow the room screen's order.
  const numbers = new Map(input.photos.map((p, i) => [p.id, i + 1]));
  const placed = new Set((input.plan.model.photos || []).map((m) => m.photoId));
  const ordered = [...input.photos.filter((p) => placed.has(p.id)), ...input.photos.filter((p) => !placed.has(p.id))];
  const images = [];
  for (const photo of ordered) {
    if (images.length >= MAX_REDESIGN_PHOTOS) break;
    const bytes = await fs.readFile(path.join(PHOTOS_DIR, photo.filename)).catch(() => null);
    if (bytes && bytes.length <= MAX_SUGGESTION_IMAGE_BYTES) images.push({ base64: bytes.toString('base64'), mediaType: photo.mimeType, number: numbers.get(photo.id) });
  }
  if (!images.length) return NextResponse.json({ error: 'photos_required' }, { status: 409, headers: NO_STORE });

  const model = input.plan.model;
  const sent = new Map(images.map((image) => [ordered.find((p) => numbers.get(p.id) === image.number).id, image.number]));
  try {
    const result = await redesignRoom(images, input.room, roomRedesign.describePlan(model, sent), {
      normalize: roomRedesign.normalizeRedesign,
      check: (r) => roomRedesign.checkRedesign(r, model),
    });
    const saved = saveRoomRedesign(roomId, identity.id, input.plan.updatedAt, { ...result, photos: images.map((image) => image.number) });
    if (!saved) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    try { logEvent(identity.id, 'room_redesign', { issues: result.layouts.reduce((n, l) => n + l.issues.length, 0) }); } catch {}
    return NextResponse.json({ ...saved, stale: false }, { headers: NO_STORE });
  } catch (error) {
    console.error('room_redesign_failed', { roomId, message: error?.message });
    return NextResponse.json({ error: 'redesign_failed' }, { status: 502, headers: NO_STORE });
  }
}
