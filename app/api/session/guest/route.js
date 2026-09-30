import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sessions, visitMetadata } from '@/lib/db';
import credentials from '@/lib/sessionCredentials.cjs';
import { isSameOriginRequest } from '@/lib/sameOrigin.cjs';
import { clientIpForGeo } from '@/lib/clientNetwork.cjs';
import { lookupCoarseGeo } from '@/lib/geo.cjs';
import { classifyUserAgent } from '@/lib/userAgentClass.cjs';

export const runtime = 'nodejs';

const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const GUEST_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60; // just a transport ceiling; the DB idle deadline is authoritative

// Only known, low-risk UTM-style keys are ever read, by name — never the raw
// query string (see the visitor observability audit's privacy matrix).
function cleanShort(value, maxLen = 120) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed || null;
}

// Explicit guest entry — the ONLY way a guest identity is ever created under
// Session V2. Never implicit, never a side effect of an ordinary GET.
export async function POST(req) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: 'cross_origin_rejected' }, { status: 403 });
  const jar = await cookies();
  const scopeRaw = jar.get(credentials.SCOPE_COOKIE)?.value;
  const familyId = scopeRaw && credentials.verify('scope', scopeRaw, process.env.AUTH_SECRET);
  if (!familyId) return NextResponse.json({ error: 'session_required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const familyRevision = Number(body?.familyRevision);
  const creationKey = typeof body?.creationKey === 'string' ? body.creationKey : crypto.randomUUID();
  if (!Number.isInteger(familyRevision) || familyRevision < 0) {
    return NextResponse.json({ error: 'invalid_revision' }, { status: 400 });
  }

  let established;
  try {
    established = sessions.guest(familyId, familyRevision, creationKey);
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'guest_establish_failed' }, { status });
  }

  const res = NextResponse.json({
    ok: true,
    state: 'active',
    identityType: 'guest',
    ownerId: established.ownerId,
    sessionId: established.sessionId,
    lifecycleRevision: established.lifecycleRevision,
    warningAt: established.warningAt,
    idleExpiresAt: established.idleExpiresAt,
    serverNow: established.serverNow,
  });
  res.cookies.set(credentials.GUEST_COOKIE, credentials.sign('guest', established.sessionId, process.env.AUTH_SECRET), {
    ...cookieOpts, maxAge: GUEST_COOKIE_MAX_AGE_S,
  });

  // Best-effort, fire-and-forget observability — must NEVER block or fail
  // establishment. Raw IP is read once, used for one in-process lookup, and
  // discarded; only the derived fields are persisted.
  try {
    const ip = clientIpForGeo(req.headers);
    const geo = lookupCoarseGeo(ip);
    const ua = classifyUserAgent(req.headers.get('user-agent') || '');
    let referrerHost = null;
    try { referrerHost = req.headers.get('referer') ? new URL(req.headers.get('referer')).hostname : null; } catch {}
    visitMetadata.record(established.sessionId, {
      countryCode: geo.countryCode, countryName: geo.countryName, region: geo.region, city: geo.city, timezone: geo.timezone,
      deviceClass: ua.deviceClass, os: ua.os, osVersion: ua.osVersion, browser: ua.browser, browserVersion: ua.browserVersion,
      entryPath: cleanShort(body?.entryPath, 200),
      referrerHost: cleanShort(referrerHost, 200),
      utmSource: cleanShort(body?.utmSource), utmMedium: cleanShort(body?.utmMedium), utmCampaign: cleanShort(body?.utmCampaign),
    });
  } catch {
    // Observability failure must never affect session establishment.
  }

  return res;
}
