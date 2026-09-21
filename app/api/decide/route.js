import { NextResponse } from 'next/server';
import { recordDecisions } from '@/lib/db';
import { RECOMMENDATIONS } from '@/lib/anthropic';
import { ROOM_OPTIONS, DEFAULT_ROOM } from '@/lib/constants';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { items, source } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items_required' }, { status: 400 });
    }

    const cleanItems = items.map((item) => ({
      category: (item.category || 'Genel Eşya').toString().slice(0, 60),
      recommendation: RECOMMENDATIONS.includes(item.recommendation) ? item.recommendation : 'tut',
      reasoning: (item.reasoning || '').toString().slice(0, 300),
      room: ROOM_OPTIONS.includes(item.room) ? item.room : DEFAULT_ROOM,
      // Sahiplik burada degil, recordDecisions icinde dogrulaniyor —
      // client'in soyledigi roomId hicbir zaman doğrudan guvenilmiyor.
      roomId: Number.isInteger(item.roomId) ? item.roomId : null,
    }));

    const state = recordDecisions(identity.id, cleanItems, source === 'oda' ? 'oda' : 'tekli');
    return NextResponse.json(state);
  } catch (err) {
    console.error('decide_failed', err);
    return NextResponse.json({ error: 'decide_failed' }, { status: 500 });
  }
}
