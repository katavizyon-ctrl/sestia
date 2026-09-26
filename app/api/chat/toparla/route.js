import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getIdentity, isAccountIdentity } from '@/lib/identity';
import { toparla } from '@/lib/db';
import openaiImage from '@/lib/openaiImage.cjs';

export const runtime = 'nodejs';

const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'chat-attachments');
// Deliberately separate from both room-photos and chat-attachments: a
// generated visualization is never mistaken for (or served through) the
// user's original-photo storage. Same directory the room-based route
// already writes to — one private result store regardless of source.
const RESULTS_DIR = path.join(process.cwd(), 'data', 'toparla-results');
const OPERATION_KEY_RE = /^[A-Za-z0-9-]{8,100}$/;

function publicResult(row) {
  return {
    id: row.id,
    sourceKind: row.sourceKind,
    chatAttachmentId: row.chatAttachmentId,
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

// Sibling of app/api/rooms/[id]/toparla/route.js for a room-less,
// chat-attachment-originated source. Same generation core
// (lib/openaiImage.cjs), same claim-before-paid-call discipline, same
// UNIQUE(device_id, operation_key) idempotency — only the ownership check,
// the source directory, and the account gate's placement (identical rule,
// applied identically) differ. The existing room-based route is untouched.
export async function POST(req) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Toparla is account-only regardless of entry point — rejected before the
  // attachment is even looked up, let alone any paid call.
  if (!isAccountIdentity(identity)) return NextResponse.json({ error: 'account_required' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const attachmentId = Number(body.attachmentId);
  const operationKey = (body.operationKey || '').toString();
  if (!Number.isInteger(attachmentId)) return NextResponse.json({ error: 'invalid_attachment' }, { status: 400 });
  if (!OPERATION_KEY_RE.test(operationKey)) return NextResponse.json({ error: 'operation_key_required' }, { status: 400 });

  const claim = toparla.claimGenerationFromAttachment(identity.id, attachmentId, operationKey, {
    model: openaiImage.MODEL,
    quality: openaiImage.QUALITY,
  });
  if (claim.error === 'attachment_not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (claim.error === 'operation_content_conflict') {
    return NextResponse.json({ error: 'operation_content_conflict' }, { status: 409 });
  }

  if (!claim.justCreated) {
    // Replay: a duplicate submission (double tap, retried request) never
    // triggers a second paid call. A row still 'pending' from a genuinely
    // concurrent request is reported as in progress rather than started again.
    if (claim.row.status === 'pending') {
      return NextResponse.json({ error: 'already_in_progress' }, { status: 409 });
    }
    return NextResponse.json(publicResult(claim.row), { status: 200 });
  }

  // We — and only we — just claimed this operation key. Everything from here
  // happens at most once for it, success or failure.
  try {
    const sourceBytes = await fs.readFile(path.join(ATTACHMENTS_DIR, claim.attachment.filename));
    const dims = openaiImage.readImageDims(sourceBytes, claim.attachment.mimeType);
    const sizeInfo = openaiImage.pickOutputSize(dims);

    const generated = await openaiImage.generateTidyImage(
      { bytes: sourceBytes, mimeType: claim.attachment.mimeType, filename: claim.attachment.filename },
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
    console.error('chat_toparla_generation_failed', { attachmentId, code, status: error?.httpStatus });
    toparla.finalizeGeneration(claim.row.id, identity.id, { status: 'failed', errorMessage: code });
    return NextResponse.json({ error: 'generation_failed' }, { status: code === 'missing_api_key' ? 500 : 502 });
  }
}
