import { NextResponse } from 'next/server';
import { recordDecisions } from '@/lib/db';
import { RECOMMENDATIONS } from '@/lib/anthropic';
import { ROOM_OPTIONS, DEFAULT_ROOM } from '@/lib/constants';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { deviceId, items, source } = body || {};

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'device_id_required' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items_required' }, { status: 400 });
    }

    const cleanItems = items.map((item) => ({
      category: (item.category || 'Genel Eşya').toString().slice(0, 60),
      recommendation: RECOMMENDATIONS.includes(item.recommendation) ? item.recommendation : 'tut',
      reasoning: (item.reasoning || '').toString().slice(0, 300),
      room: ROOM_OPTIONS.includes(item.room) ? item.room : DEFAULT_ROOM,
    }));

    const state = recordDecisions(deviceId, cleanItems, source === 'oda' ? 'oda' : 'tekli');
    return NextResponse.json(state);
  } catch (err) {
    console.error('decide_failed', err);
    return NextResponse.json({ error: 'decide_failed' }, { status: 500 });
  }
}
