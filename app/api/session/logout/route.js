import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/db';
import { auth } from '@/lib/auth';
import credentials from '@/lib/sessionCredentials.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';

export const runtime = 'nodejs';

// Revokes the EXPECTED current session only — a stale logout targeting an
// old sid/revision must never revoke a successor (docs/reports/
// SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md §8/§21). Cookie cleanup here is
// hygiene; sessions.logout()'s DB write is the actual security boundary.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  const jar = await cookies();
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const familyId = scopeRaw && credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET);
  const res = NextResponse.json({ ok: true });
  if (!familyId) return res;

  const authSession = await auth();
  if (authSession?.sestiaSid) {
    sessions.logout(authSession.sestiaSid, familyId);
    res.cookies.delete('authjs.session-token');
  } else {
    const guestRaw = jar.get(credentials.GUEST_COOKIE)?.value;
    const guestSessionId = guestRaw ? credentials.verify('guest', guestRaw, process.env.AUTH_SECRET) : null;
    if (guestSessionId) sessions.logout(guestSessionId, familyId);
  }
  res.cookies.delete(credentials.GUEST_COOKIE);
  return res;
}
