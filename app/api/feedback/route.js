import { NextResponse } from 'next/server';
import { recordFeedback } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { deviceId, message, screen } = body || {};
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'device_id_required' }, { status: 400 });
    }
    const clean = (message || '').toString().trim().slice(0, 2000);
    if (!clean) {
      return NextResponse.json({ error: 'message_required' }, { status: 400 });
    }
    recordFeedback(deviceId, clean, (screen || '').toString().slice(0, 60));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('feedback_failed', err);
    return NextResponse.json({ error: 'feedback_failed' }, { status: 500 });
  }
}
