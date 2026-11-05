import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/db';
import { auth } from '@/lib/auth';
import credentials from '@/lib/sessionCredentials.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';
import { ownerSessionFrom } from '@/lib/ownerEntry';

export const runtime = 'nodejs';

// The ONLY normal activity writer (docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md
// §6 endpoint contract). Every other request in this app — GETs, media
// reads, telemetry, status checks — must never call this. Validates the
// existing active credential; never creates one.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  const jar = await cookies();
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const familyId = scopeRaw && credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET);
  if (!familyId) return NextResponse.json({ error: 'session_required' }, { status: 401 });

  // An active owner session (lib/ownerEntry.js) is the one being used, same
  // precedence as lib/session.js.
  const owner = ownerSessionFrom(jar);
  const ownerActive = owner && owner.familyId === familyId && sessions.check(owner.sessionId, familyId).state === 'active';
  const authSession = ownerActive ? null : await auth();
  const sessionId = (ownerActive && owner.sessionId) || authSession?.sestiaSid
    || (() => {
      const guestRaw = jar.get(credentials.GUEST_COOKIE)?.value;
      return guestRaw ? credentials.verify('guest', guestRaw, process.env.AUTH_SECRET) : null;
    })();
  if (!sessionId) return NextResponse.json({ error: 'session_required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventAt = Number(body?.eventAt);
  const event = typeof body?.event === 'string' ? body.event : null;
  if (!event || !Number.isSafeInteger(eventAt)) {
    return NextResponse.json({ error: 'invalid_activity' }, { status: 400 });
  }

  try {
    const result = sessions.activity(sessionId, familyId, eventAt, event);
    return NextResponse.json({
      state: 'active',
      warningAt: result.warningAt,
      idleExpiresAt: result.idleExpiresAt,
      warning: result.warning,
      serverNow: result.serverNow,
    });
  } catch (error) {
    const status = error?.status || 401;
    return NextResponse.json({ state: error?.message || 'session_required' }, { status });
  }
}
