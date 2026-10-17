import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { roomSuggestions } from '@/lib/db';

export const runtime = 'nodejs';

// "Yapılacaklara ekle": adding the same idea twice returns the existing item.
export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, suggestionId, ideaIndex } = await params;
  const found = roomSuggestions.getIdea(Number(suggestionId), Number(ideaIndex), identity.id);
  if (!found || found.suggestion.roomId !== Number(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(roomSuggestions.addTodo(found.suggestion.id, found.ideaIndex, identity.id));
}
