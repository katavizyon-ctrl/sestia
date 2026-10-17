import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { roomSuggestions } from '@/lib/db';

export const runtime = 'nodejs';

// Reopens one saved suggestion with its follow-up conversation. Ownership is
// enforced by the store (device_id); a suggestion from another room is treated
// as not found rather than served under the wrong room.
export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, suggestionId } = await params;
  const roomId = Number(id);
  const suggestion = roomSuggestions.get(Number(suggestionId), identity.id);
  if (!suggestion || suggestion.roomId !== roomId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(suggestion);
}
