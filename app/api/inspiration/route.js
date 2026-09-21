import { NextResponse } from 'next/server';
import { getState, getRecentDecisions, getInspirationCache, setInspirationCache } from '@/lib/db';
import { generateWeeklyTips } from '@/lib/anthropic';
import { getIdentity } from '@/lib/identity';

export const runtime = 'nodejs';

const MIN_DECISIONS = 5;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const state = getState(identity.id);
  if (state.totalDecisions < MIN_DECISIONS) {
    return NextResponse.json({ error: 'not_enough_data' }, { status: 404 });
  }

  const cached = getInspirationCache(identity.id);
  const cacheAge = cached ? Date.now() - new Date(`${cached.created_at}Z`).getTime() : Infinity;
  if (cached && cached.decision_count_at_generation === state.totalDecisions && cacheAge < CACHE_MAX_AGE_MS) {
    return NextResponse.json(JSON.parse(cached.payload_json));
  }

  const decisions = getRecentDecisions(identity.id, 30);
  if (decisions.length === 0) {
    return NextResponse.json({ error: 'not_enough_data' }, { status: 404 });
  }
  const summaryText = decisions.map((d) => `- ${d.category} · ${d.room} · ${d.recommendation}`).join('\n');

  try {
    const tips = await generateWeeklyTips(summaryText);
    setInspirationCache(identity.id, tips, state.totalDecisions);
    return NextResponse.json(tips);
  } catch (err) {
    console.error('inspiration_failed', err);
    return NextResponse.json({ error: 'inspiration_failed' }, { status: 500 });
  }
}
