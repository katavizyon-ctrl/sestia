import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { getRoomBlueprint, putRoomBlueprint } from '@/lib/db';
import validation from '@/lib/blueprintValidation.cjs';

export const runtime = 'nodejs';

// "Oda Planı": one measured blueprint per room. Only the room's owner can read
// or save it; someone else's room is a plain 404, so its existence never leaks.
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const MAX_BYTES = validation.MAX_BLUEPRINT_BYTES;
const fail = (error, status) => NextResponse.json({ error }, { status, headers: NO_STORE });

async function roomIdFrom(params) {
  const { id } = await params;
  const roomId = /^[1-9]\d{0,15}$/.test(String(id)) ? Number(id) : NaN;
  return Number.isSafeInteger(roomId) ? roomId : null;
}

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return fail('unauthorized', 401);
  const roomId = await roomIdFrom(params);
  if (!roomId) return fail('invalid_room', 400);
  const blueprint = getRoomBlueprint(roomId, identity.id);
  if (!blueprint) return fail('not_found', 404);
  return NextResponse.json(blueprint, { headers: NO_STORE });
}

export async function PUT(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return fail('unauthorized', 401);
  const roomId = await roomIdFrom(params);
  if (!roomId) return fail('invalid_room', 400);
  // A JSON body only: a cross-site form post cannot send this content type
  // without a CORS preflight, which this route never answers.
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return fail('unsupported_media_type', 415);
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) return fail('too_large', 413);
  // The length header can be missing or wrong, so the body is measured too.
  const text = await req.text().catch(() => null);
  if (text == null) return fail('invalid_blueprint', 400);
  if (Buffer.byteLength(text) > MAX_BYTES) return fail('too_large', 413);
  let body;
  try { body = JSON.parse(text); } catch { return fail('invalid_blueprint', 400); }
  if (!body || typeof body !== 'object' || !validation.validBlueprint(body.model)) return fail('invalid_blueprint', 400);
  const saved = putRoomBlueprint(roomId, identity.id, validation.normalizeBlueprint(body.model));
  if (!saved) return fail('not_found', 404);
  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt }, { headers: NO_STORE });
}
