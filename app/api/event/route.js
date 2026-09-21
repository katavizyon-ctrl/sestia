import { NextResponse } from 'next/server';
import { logEvent } from '@/lib/db';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const identity = await getIdentity();
    if (!identity) {
      // Telemetri asla ana akisi bozmamali (bkz. lib/telemetry.js) — ama
      // kimliksiz de yazmiyoruz, sessizce atliyoruz.
      return NextResponse.json({ ok: false });
    }
    const body = await req.json();
    const { eventType, payload } = body || {};
    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
    }
    logEvent(identity.id, eventType, payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
