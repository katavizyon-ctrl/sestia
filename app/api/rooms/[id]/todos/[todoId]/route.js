import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { roomSuggestions } from '@/lib/db';

export const runtime = 'nodejs';

// Tick or untick a to-do. Room and device are both part of the update, so an
// id from another room or another user changes nothing and reads as 404.
export async function PATCH(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, todoId } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.done !== 'boolean') return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const todo = roomSuggestions.setTodoDone(Number(todoId), Number(id), identity.id, body.done);
  if (!todo) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(todo);
}

export async function DELETE(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, todoId } = await params;
  if (!roomSuggestions.removeTodo(Number(todoId), Number(id), identity.id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
