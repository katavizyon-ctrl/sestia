import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { sessions } from '@/lib/db';
import credentials from '@/lib/sessionCredentials.cjs';
import privateAccess from '@/lib/privateAccess.cjs';

const { GUEST_COOKIE, SCOPE_COOKIE } = credentials;

function secret() {
  return process.env.AUTH_SECRET;
}

// The ONE place every private surface resolves session/identity through —
// see docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md §6 ("Shared
// authorization primitive"). Never a raw JWT-only shortcut, never an
// implicit guest fallback after an invalid/expired account session, never
// implicit guest creation here (that only happens via the explicit
// POST /api/session/guest route).
//
// Returns either an ACTIVE state (spread of lib/sessionStore.cjs's `view`
// shape, plus identityType) or a typed INACTIVE result:
// { state: 'session_required'|'session_expired'|'session_revoked'|'session_replaced', identityType, serverNow }
export async function getSessionState() {
  const jar = await cookies();
  const scopeRaw = jar.get(SCOPE_COOKIE)?.value;
  const familyId = scopeRaw ? credentials.verify('scope', scopeRaw, secret()) : null;

  // Account identity takes unconditional precedence, exactly like the
  // pre-V2 getIdentity() — and once ANY Auth.js session exists, we never
  // fall through to a guest cookie from the same browser, even if the
  // account's Session V2 binding turns out to be invalid (a rejected
  // account must not silently resume as a leftover guest).
  const authSession = await auth();
  if (authSession?.user?.id) {
    if (!privateAccess.isAllowedEmail(authSession.user.email)) {
      return { state: 'session_revoked', identityType: 'account', serverNow: Date.now() };
    }
    if (!authSession.sestiaSid || !familyId) {
      // Legacy JWT (no v2 sid yet) or no family scope cookie at all —
      // requires fresh email authentication, never synthesized here.
      return { state: 'session_required', identityType: 'account', serverNow: Date.now() };
    }
    const result = sessions.check(authSession.sestiaSid, familyId);
    return { ...result, identityType: 'account', ownerId: result.ownerId ?? authSession.user.id };
  }

  if (privateAccess.emailRequired()) return { state: 'session_required', identityType: 'guest', serverNow: Date.now() };

  if (!familyId) return { state: 'session_required', identityType: 'guest', serverNow: Date.now() };
  const guestRaw = jar.get(GUEST_COOKIE)?.value;
  const guestSessionId = guestRaw ? credentials.verify('guest', guestRaw, secret()) : null;
  if (!guestSessionId) return { state: 'session_required', identityType: 'guest', serverNow: Date.now() };
  return sessions.check(guestSessionId, familyId);
}

// Preserves the exact pre-V2 {id, type} | null contract so every existing
// Conversation/Toparla/room route keeps working unchanged.
export async function getIdentity() {
  const state = await getSessionState();
  if (state.state !== 'active') return null;
  return { id: state.ownerId, type: state.identityType };
}

// Paid/account-only capabilities (Toparla) share this one check — unchanged
// from the pre-V2 helper, still backed by the same source of truth.
export function isAccountIdentity(identity) {
  return identity?.type === 'account';
}
