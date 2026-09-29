import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSessionState } from '@/lib/session';
import adminAccess from '@/lib/adminAccess.cjs';
import accessTokens from '@/lib/accessToken.cjs';

// Server-side re-check for every admin page and admin route, on top of
// proxy.js. Returns { mode: 'owner', sessionId } | { mode: 'code' } | null.
export async function getAdminAccess() {
  if (adminAccess.ownerMode()) {
    const authSession = await auth();
    if (!adminAccess.isOwnerEmail(authSession?.user?.email)) return null;
    const state = await getSessionState();
    if (state.state !== 'active' || state.identityType !== 'account') return null;
    return { mode: 'owner', sessionId: state.sessionId };
  }
  const jar = await cookies();
  return accessTokens.verifyAccessToken(jar.get('admin_ok')?.value, 'admin') ? { mode: 'code' } : null;
}

// Page entry point: redirects when access is missing and leaves one
// server-log line per admin view (path, access mode, short session id —
// never an email). A persistent admin audit table is Phase 2.
export async function requireAdmin(viewPath) {
  const access = await getAdminAccess();
  if (!access) redirect('/admin-giris');
  console.info('admin_view', JSON.stringify({ path: viewPath, mode: access.mode, session: access.sessionId?.slice(0, 8) ?? null }));
  return access;
}
