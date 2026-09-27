import { NextResponse } from 'next/server';
import { getIdentity, isAccountIdentity } from '@/lib/identity';
import { toparla } from '@/lib/db';

export const runtime = 'nodejs';

// Read-only recovery for an account that reauthenticated after a Toparla
// operation was accepted before session expiry (docs/reports/
// SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md §16). Metadata only — never
// calls a provider, never claims a new operation, never returns bytes.
export async function GET(req) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isAccountIdentity(identity)) return NextResponse.json({ error: 'account_required' }, { status: 403 });

  const limitParam = new URL(req.url).searchParams.get('limit');
  const operations = toparla.listOwned(identity.id, { limit: limitParam ? Number(limitParam) : 20 });
  return NextResponse.json({ operations });
}
