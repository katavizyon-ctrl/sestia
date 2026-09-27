import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/db';
import credentials from '@/lib/sessionCredentials.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';

export const runtime = 'nodejs';

// proxy.js already unconditionally ensures the family/scope cookie exists on
// every qualifying request (no private data in that step). This route exists
// so the client has one explicit, awaitable call to confirm the coordination
// scope is ready and learn its current revision (needed to call
// POST /api/session/guest correctly) — it creates NO identity/session itself.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  const jar = await cookies();
  const raw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const familyId = raw && credentials.verify('scope', raw, process.env.AUTH_SECRET);
  const family = familyId && sessions.family(familyId);
  if (!family) return NextResponse.json({ error: 'session_required' }, { status: 500 });
  return NextResponse.json({ ok: true, familyRevision: family.revision, hasActiveSession: Boolean(family.current_session_id) });
}
