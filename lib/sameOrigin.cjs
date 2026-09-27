// Minimal same-origin check for the new session-mutation routes (bootstrap,
// activity, guest, login-intent, logout). These are cookie-authorized POSTs,
// so without this check a cross-site page could trigger them via a simple
// same-site-lax-exempt form/fetch. Modern browsers send `Sec-Fetch-Site` on
// every request; `same-origin`/`none` (direct navigation/devtools/curl, which
// carries no session cookie to abuse anyway) are accepted, everything else
// (`cross-site`, `same-site`) is rejected. Falls back to comparing `Origin`
// against the request's own host for the rare client that omits
// Sec-Fetch-Site, never fails open.
function isSameOriginRequest(req) {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin' || fetchSite === 'none';
  const origin = req.headers.get('origin');
  if (!origin) return true; // no Origin header at all (non-browser client) — nothing to compare
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

module.exports = { isSameOriginRequest };
