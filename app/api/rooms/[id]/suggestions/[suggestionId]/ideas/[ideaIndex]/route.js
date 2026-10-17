import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getIdentity } from '@/lib/identity';
import { roomSuggestions, getRoomName, logEvent } from '@/lib/db';
import { suggestIdeaPlan, MAX_SUGGESTION_IMAGE_BYTES } from '@/lib/anthropic';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');

// The idea is found through the owned suggestion, and only under its own
// room — any mismatch is "not found", never a different idea.
async function resolveIdea(params, identity) {
  const { id, suggestionId, ideaIndex } = await params;
  const found = roomSuggestions.getIdea(Number(suggestionId), Number(ideaIndex), identity.id);
  return found && found.suggestion.roomId === Number(id) ? found : null;
}

function publicIdea(found) {
  return {
    roomId: found.suggestion.roomId,
    suggestionId: found.suggestion.id,
    ideaIndex: found.ideaIndex,
    sourcePhotoId: found.suggestion.sourcePhotoId,
    idea: found.idea,
    plan: found.plan,
    messages: found.messages,
    todo: found.todo,
    visual: found.visual,
  };
}

// Opening an idea: everything already saved, no AI call.
export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const found = await resolveIdea(params, identity);
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(publicIdea(found));
}

// Builds the step-by-step plan once; later calls return the saved plan
// without a second AI call.
export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const found = await resolveIdea(params, identity);
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (found.plan) return NextResponse.json(publicIdea(found));

  const photo = roomSuggestions.getOwnedPhoto(found.suggestion.sourcePhotoId, found.suggestion.roomId, identity.id);
  const bytes = photo ? await fs.readFile(path.join(PHOTOS_DIR, photo.filename)).catch(() => null) : null;
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (bytes.length > MAX_SUGGESTION_IMAGE_BYTES) return NextResponse.json({ error: 'photo_too_large' }, { status: 422 });

  try {
    const plan = await suggestIdeaPlan(
      { base64: bytes.toString('base64'), mediaType: photo.mimeType },
      getRoomName(found.suggestion.roomId, identity.id),
      found.suggestion,
      found.ideaIndex,
    );
    roomSuggestions.savePlan(found.suggestion.id, found.ideaIndex, identity.id, plan);
    try { logEvent(identity.id, 'room_suggestion_plan', { area: found.idea.area }); } catch {}
    return NextResponse.json(publicIdea(roomSuggestions.getIdea(found.suggestion.id, found.ideaIndex, identity.id)));
  } catch (error) {
    console.error('room_suggestion_plan_failed', { suggestionId: found.suggestion.id, ideaIndex: found.ideaIndex, message: error?.message });
    return NextResponse.json({ error: 'plan_failed' }, { status: 502 });
  }
}
