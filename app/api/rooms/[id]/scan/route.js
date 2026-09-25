import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/identity';
import { roomDecisions } from '@/lib/db';
import { validRoomItems, validRoomScanMessages } from '@/lib/anthropic';

export const runtime = 'nodejs';

async function handle(req, params, operation) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const roomId = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!Number.isInteger(roomId) || !body) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  if (body.protocol !== 2) return NextResponse.json({ error: 'client_upgrade_required', message: 'Uygulama güncellendi. Sayfayı yenileyip odayı yeniden aç.' }, { status: 409 });
  if (operation === 'save' && body.action === 'begin') operation = 'begin';
  if (operation === 'close' && body.orphanToken) operation = 'closeLegacy';
  if (operation === 'close' && body.action === 'release') operation = 'releaseEmpty';
  if (operation === 'begin' || operation === 'releaseEmpty') {
    if (!/^[A-Za-z0-9-]{8,100}$/.test(body.sessionKey || '') ||
        (operation === 'begin' && !Number.isInteger(body.expectedGeneration)))
      return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  } else if (operation === 'closeLegacy') {
    if (!/^[a-f0-9]{64}$/.test(body.orphanToken) || !Number.isInteger(body.expectedGeneration))
      return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  } else {
    if (operation === 'save') {
      if (!/^[A-Za-z0-9-]{8,100}$/.test(body.sessionKey || '') || !validRoomItems(body.items) ||
          !Array.isArray(body.messages) || (body.messages.length && !validRoomScanMessages(body.messages, 12000)) ||
          !Array.isArray(body.photoIds)) return NextResponse.json({ error: 'invalid_scan' }, { status: 400 });
    } else if (!Number.isInteger(body.analysisId)) {
      return NextResponse.json({ error: 'analysis_required' }, { status: 400 });
    }
  }
  try {
    return NextResponse.json(roomDecisions[operation](roomId, identity.id, body));
  } catch (err) {
    if (!err.status) console.error('room_scan_failed', { operation, roomId, code: err.code || 'unexpected', message: err.message });
    if (err.code?.startsWith('SQLITE_BUSY')) return NextResponse.json({ error: 'retry_conflict' }, { status: 409 });
    return NextResponse.json({ error: err.status ? err.message : 'scan_failed' }, { status: err.status || 500 });
  }
}

export async function GET(req, { params }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(roomDecisions.snapshot(Number((await params).id), identity.id, new URL(req.url).searchParams.get('sessionKey')));
  } catch (err) {
    if (!err.status) console.error('room_scan_read_failed', { code: err.code || 'unexpected' });
    return NextResponse.json({ error: err.status ? err.message : 'scan_failed' }, { status: err.status || 500 });
  }
}

export const POST = (req, { params }) => handle(req, params, 'save');
export const PATCH = (req, { params }) => handle(req, params, 'draft');
// A late close cannot modify a different analysis or finalize its decisions.
export const DELETE = (req, { params }) => handle(req, params, 'close');
export const PUT = (req, { params }) => handle(req, params, 'confirm');
