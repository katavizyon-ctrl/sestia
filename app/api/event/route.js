import { NextResponse } from 'next/server';
import { logEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { deviceId, eventType, payload } = body || {};
    if (!deviceId || typeof deviceId !== 'string' || !eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
    }
    logEvent(deviceId, eventType, payload);
    return NextResponse.json({ ok: true });
  } catch {
    // Telemetri asla ana akışı bozmamalı; sessizce 200 dön.
    return NextResponse.json({ ok: false });
  }
}
