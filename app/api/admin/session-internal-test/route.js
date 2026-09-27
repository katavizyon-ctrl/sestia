import { NextResponse } from 'next/server';
import { visitMetadata } from '@/lib/db';

export const runtime = 'nodejs';

// Explicit, admin-only classification. Never inferred from IP/geo/device/
// timing (see docs/reports/SESTIA_VISITOR_SESSION_METADATA_OBSERVABILITY_AUDIT.md
// §9) and never consulted by lib/session.js — purely operational metadata.
// Reached only under proxy.js's existing /api/admin* admin_ok gate.
export async function POST(req) {
  const form = await req.formData().catch(() => null);
  const sessionId = form?.get('sessionId')?.toString();
  const value = form?.get('value')?.toString();
  if (!sessionId || (value !== '1' && value !== '0')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  visitMetadata.setInternalTest(sessionId, value === '1');
  const url = new URL('/admin', req.url);
  const filter = form?.get('filter')?.toString();
  if (filter) url.searchParams.set('filter', filter);
  return NextResponse.redirect(url, { status: 303 });
}
