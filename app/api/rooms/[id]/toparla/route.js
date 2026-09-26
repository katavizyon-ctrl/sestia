import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getIdentity, isAccountIdentity } from '@/lib/identity';
import { toparla } from '@/lib/db';
import openaiImage from '@/lib/openaiImage.cjs';

export const runtime = 'nodejs';

const PHOTOS_DIR = path.join(process.cwd(), 'data', 'room-photos');
// Deliberately separate from room-photos: a generated visualization is never
// mistaken for (or served through) the user's original-photo storage/gallery.
const RESULTS_DIR = path.join(process.cwd(), 'data', 'toparla-results');
const OPERATION_KEY_RE = /^[A-Za-z0-9-]{8,100}$/;

function publicResult(row) {
  return {
    id: row.id,
    roomId: row.roomId,
    sourcePhotoId: row.sourcePhotoId,
    status: row.status,
    model: row.model,
    quality: row.quality,
    outputWidth: row.outputWidth,
    outputHeight: row.outputHeight,
    exactRatio: row.exactRatio,
    errorMessage: row.status === 'failed' ? 'generation_failed' : undefined,
    createdAt: row.createdAt,
  };
}

export async function POST(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Toparla is account-only: paid generation must never be reachable by a
  // guest, regardless of entry point (Room Detail here, or chat — see
  // app/api/chat/toparla/route.js). Checked before touching the room/photo
  // at all, so a guest never even reaches the claim/idempotency layer.
  if (!isAccountIdentity(identity)) return NextResponse.json({ error: 'account_required' }, { status: 403 });

  const { id } = await params;
  const roomId = Number(id);
  if (!Number.isInteger(roomId)) return NextResponse.json({ error: 'invalid_room' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const photoId = Number(body.photoId);
  const operationKey = (body.operationKey || '').toString();
  if (!Number.isInteger(photoId)) return NextResponse.json({ error: 'invalid_photo' }, { status: 400 });
  if (!OPERATION_KEY_RE.test(operationKey)) return NextResponse.json({ error: 'operation_key_required' }, { status: 400 });

  const claim = toparla.claimGeneration(identity.id, roomId, photoId, operationKey, {
    model: openaiImage.MODEL,
    quality: openaiImage.QUALITY,
  });
  if (claim.error === 'room_not_found' || claim.error === 'photo_not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (claim.error === 'operation_content_conflict') {
    return NextResponse.json({ error: 'operation_content_conflict' }, { status: 409 });
  }

  if (!claim.justCreated) {
    // Replay: a duplicate submission (double tap, retried request, refresh
    // resending the same key) never triggers a second paid call. A row still
    // 'pending' from a genuinely concurrent request is reported as in
    // progress rather than started a second time.
    if (claim.row.status === 'pending') {
      return NextResponse.json({ error: 'already_in_progress' }, { status: 409 });
    }
    return NextResponse.json(publicResult(claim.row), { status: 200 });
  }

  // We — and only we — just claimed this operation key. Everything from here
  // happens at most once for it, success or failure.
  try {
    const sourceBytes = await fs.readFile(path.join(PHOTOS_DIR, claim.photo.filename));
    const dims = openaiImage.readImageDims(sourceBytes, claim.photo.mimeType);
    const sizeInfo = openaiImage.pickOutputSize(dims);

    const generated = await openaiImage.generateTidyImage(
      { bytes: sourceBytes, mimeType: claim.photo.mimeType, filename: claim.photo.filename },
      sizeInfo
    );

    const filename = `toparla-${crypto.randomUUID()}.${openaiImage.OUTPUT_FORMAT}`;
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    await fs.writeFile(path.join(RESULTS_DIR, filename), generated.bytes);

    toparla.finalizeGeneration(claim.row.id, identity.id, {
      status: 'completed',
      filename,
      mimeType: `image/${openaiImage.OUTPUT_FORMAT}`,
      outputWidth: sizeInfo.width,
      outputHeight: sizeInfo.height,
      sourceRatio: sizeInfo.sourceRatio,
      appliedRatio: sizeInfo.appliedRatio,
      exact: sizeInfo.exact,
    });

    return NextResponse.json(publicResult({
      ...claim.row,
      status: 'completed',
      outputWidth: sizeInfo.width,
      outputHeight: sizeInfo.height,
      exactRatio: sizeInfo.exact,
    }));
  } catch (error) {
    const code = error?.code || 'internal_error';
    console.error('toparla_generation_failed', { roomId, photoId, code, status: error?.httpStatus });
    toparla.finalizeGeneration(claim.row.id, identity.id, { status: 'failed', errorMessage: code });
    return NextResponse.json({ error: 'generation_failed' }, { status: code === 'missing_api_key' ? 500 : 502 });
  }
}
