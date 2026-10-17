import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getIdentity } from '@/lib/identity';
import { roomSuggestions, getRoomName, logEvent } from '@/lib/db';
import { suggestRoomIdeas, MAX_SUGGESTION_IMAGE_BYTES } from '@/lib/anthropic';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');

// "Bana öneri ver": one AI call per explicit tap, on a photo this identity
// owns. Like the room scan (and unlike Toparla's paid image generation) it is
// open to guests too — only a valid identity is required.
export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const roomId = Number(id);
  if (!Number.isInteger(roomId)) return NextResponse.json({ error: 'invalid_room' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const photoId = Number(body?.photoId);
  if (!Number.isInteger(photoId)) return NextResponse.json({ error: 'invalid_photo' }, { status: 400 });

  // The photo is only ever read from disk after ownership of both the room
  // and the photo is confirmed — the client never supplies image bytes here.
  const photo = roomSuggestions.getOwnedPhoto(photoId, roomId, identity.id);
  if (!photo) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const bytes = await fs.readFile(path.join(PHOTOS_DIR, photo.filename)).catch(() => null);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (bytes.length > MAX_SUGGESTION_IMAGE_BYTES) return NextResponse.json({ error: 'photo_too_large' }, { status: 422 });

  try {
    const ideas = await suggestRoomIdeas({ base64: bytes.toString('base64'), mediaType: photo.mimeType }, getRoomName(roomId, identity.id));
    const suggestion = roomSuggestions.create(identity.id, roomId, photoId, ideas);
    if (!suggestion) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    try { logEvent(identity.id, 'room_suggestion', { ideas: suggestion.ideas.length }); } catch {}
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('room_suggestion_failed', { roomId, photoId, message: error?.message });
    return NextResponse.json({ error: 'suggestion_failed' }, { status: 502 });
  }
}
