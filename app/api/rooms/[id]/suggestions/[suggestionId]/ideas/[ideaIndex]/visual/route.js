import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getIdentity, isAccountIdentity } from '@/lib/identity';
import { roomSuggestions } from '@/lib/db';
import openaiImage from '@/lib/openaiImage.cjs';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');
// Kept apart from room photos and Toparla results: a generated image is never
// mistaken for (or served as) either.
const VISUALS_DIR = path.join(process.cwd(), 'data', 'idea-visuals');
const OPERATION_KEY_RE = /^[A-Za-z0-9-]{8,100}$/;

// "Nasıl görünür?": a paid image edit that applies only the chosen idea.
// Account-only like Toparla, checked before any claim; the claim is made
// before the paid call so a repeated request never pays twice.
export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isAccountIdentity(identity)) return NextResponse.json({ error: 'account_required' }, { status: 403 });

  const { id, suggestionId, ideaIndex } = await params;
  const body = await req.json().catch(() => ({}));
  const operationKey = (body?.operationKey || '').toString();
  if (!OPERATION_KEY_RE.test(operationKey)) return NextResponse.json({ error: 'operation_key_required' }, { status: 400 });

  const found = roomSuggestions.getIdea(Number(suggestionId), Number(ideaIndex), identity.id);
  if (!found || found.suggestion.roomId !== Number(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const claim = roomSuggestions.claimVisual(found.suggestion.id, found.ideaIndex, identity.id, operationKey, {
    model: openaiImage.MODEL,
    quality: openaiImage.QUALITY,
  });
  if (claim.error === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (claim.error === 'photo_deleted') return NextResponse.json({ error: 'photo_deleted' }, { status: 409 });
  if (claim.error === 'operation_content_conflict') return NextResponse.json({ error: 'operation_content_conflict' }, { status: 409 });
  if (!claim.justCreated) {
    if (claim.row.status === 'pending') return NextResponse.json({ error: 'already_in_progress' }, { status: 409 });
    return NextResponse.json(claim.row);
  }

  try {
    const sourceBytes = await fs.readFile(path.join(PHOTOS_DIR, claim.photo.filename));
    const sizeInfo = openaiImage.pickOutputSize(openaiImage.readImageDims(sourceBytes, claim.photo.mimeType));
    const generated = await openaiImage.generateTidyImage(
      { bytes: sourceBytes, mimeType: claim.photo.mimeType, filename: claim.photo.filename },
      sizeInfo,
      openaiImage.buildIdeaVisualPrompt(claim.idea),
    );
    const filename = `idea-${crypto.randomUUID()}.${openaiImage.OUTPUT_FORMAT}`;
    await fs.mkdir(VISUALS_DIR, { recursive: true });
    await fs.writeFile(path.join(VISUALS_DIR, filename), generated.bytes);
    return NextResponse.json(roomSuggestions.finalizeVisual(claim.row.id, identity.id, {
      status: 'completed',
      filename,
      mimeType: `image/${openaiImage.OUTPUT_FORMAT}`,
      outputWidth: sizeInfo.width,
      outputHeight: sizeInfo.height,
    }));
  } catch (error) {
    const code = error?.code || 'internal_error';
    console.error('idea_visual_failed', { suggestionId: found.suggestion.id, ideaIndex: found.ideaIndex, code, status: error?.httpStatus });
    roomSuggestions.finalizeVisual(claim.row.id, identity.id, { status: 'failed', errorMessage: code });
    return NextResponse.json({ error: 'generation_failed' }, { status: code === 'missing_api_key' ? 500 : 502 });
  }
}
