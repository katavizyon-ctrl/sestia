// Single, centralized place to extract the real client network address from
// a request's headers. Railway's edge appends the connecting address last in
// X-Forwarded-For, so a client-supplied earlier hop can never be used to
// spoof it — this exact interpretation was already relied upon in production
// by lib/attemptLimiter.cjs before this file existed; that module now
// delegates here instead of keeping a second, potentially-diverging copy.
function clientIp(headers) {
  const forwarded = (headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return forwarded[forwarded.length - 1] || headers.get('x-real-ip') || null;
}

module.exports = { clientIp };
