import { NextResponse } from 'next/server';
import { recordFeedback } from '@/lib/db';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { message, screen } = body || {};
    const clean = (message || '').toString().trim().slice(0, 2000);
    if (!clean) {
      return NextResponse.json({ error: 'message_required' }, { status: 400 });
    }
    recordFeedback(identity.id, clean, (screen || '').toString().slice(0, 60));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('feedback_failed', err);
    return NextResponse.json({ error: 'feedback_failed' }, { status: 500 });
  }
}
