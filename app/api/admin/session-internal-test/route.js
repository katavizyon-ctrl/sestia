import { NextResponse } from 'next/server';
import { visitMetadata } from '@/lib/db';
import { getAdminAccess } from '@/lib/adminGuard';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';
import adminAccess from '@/lib/adminAccess.cjs';

export const runtime = 'nodejs';

const SESSION_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

// Explicit, admin-only classification. Never inferred from IP/geo/device/
// timing (see docs/reports/SESTIA_VISITOR_SESSION_METADATA_OBSERVABILITY_AUDIT.md
// §9) and never consulted by lib/session.js — purely operational metadata.
// Gated by proxy.js and re-checked here; a cookie-authorized POST must also
// come from this origin.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  if (!(await getAdminAccess())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const sessionId = form?.get('sessionId')?.toString();
  const value = form?.get('value')?.toString();
  if (!sessionId || !SESSION_ID.test(sessionId) || (value !== '1' && value !== '0')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  visitMetadata.setInternalTest(sessionId, value === '1');
  // Relative Location: the browser resolves it against the page it is on.
  // Building an absolute URL from req.url leaked Railway's internal origin.
  return new NextResponse(null, { status: 303, headers: { Location: adminAccess.adminReturnPath(form?.get('returnTo')?.toString()) } });
}
