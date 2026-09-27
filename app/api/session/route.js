import { NextResponse } from 'next/server';
import { getSessionState } from '@/lib/session';

export const runtime = 'nodejs';

// Non-renewing lifecycle/status read. Never writes activity, never creates a
// family/session. The client's lifecycle controller polls this only to
// validate (mount, tab focus/visibility return, BFCache restore, near the
// known deadline) — see docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md §6/§11.
export async function GET() {
  const state = await getSessionState();
  if (state.state !== 'active') {
    return NextResponse.json({ state: state.state, identityType: state.identityType || null, serverNow: state.serverNow }, { status: 200 });
  }
  return NextResponse.json({
    state: 'active',
    identityType: state.identityType,
    ownerId: state.ownerId,
    sessionId: state.sessionId,
    lifecycleRevision: state.lifecycleRevision,
    policyVersion: state.policyVersion,
    warningAt: state.warningAt,
    idleExpiresAt: state.idleExpiresAt,
    warning: state.warning,
    serverNow: state.serverNow,
  });
}
