// Coarse, server-side, IP-derived location — never GPS, never a browser
// permission prompt, never a live third-party API call. Uses the locally
// bundled `geoip-lite` dataset (in-process lookup, no network request).
//
// Chosen after comparing geoip-lite against fast-geoip (see the visitor
// observability audit): both bundle a comparably large dataset (100MB+
// unpacked) since city-level coverage is inherently large; geoip-lite is
// simpler (loads once into memory, Apache-2.0, actively maintained, needs no
// MaxMind account/license key/build-time download), so it was preferred over
// a design requiring an out-of-band database fetch.
//
// Callers must NEVER persist the raw IP passed in here — only the return
// value (already reduced to coarse fields) is meant to be stored.
const geoip = require('geoip-lite');

const UNKNOWN = Object.freeze({ countryCode: null, countryName: null, region: null, city: null, timezone: null });

// geoip-lite has no country-name table of its own; Node's built-in
// Intl.DisplayNames already covers every ISO 3166-1 code with a localized
// name, so no second dependency or hand-maintained map is needed.
let countryNamesTr;
try {
  countryNamesTr = new Intl.DisplayNames(['tr'], { type: 'region' });
} catch {
  countryNamesTr = null;
}
function countryName(code) {
  try {
    return (countryNamesTr && countryNamesTr.of(code)) || code;
  } catch {
    return code;
  }
}

function lookupCoarseGeo(ip) {
  if (!ip || typeof ip !== 'string') return UNKNOWN;
  let result;
  try {
    result = geoip.lookup(ip);
  } catch {
    // A malformed/unsupported address must never block session
    // establishment — degrade to unknown exactly like a lookup miss.
    return UNKNOWN;
  }
  // Private/loopback/reserved ranges and lookup misses both return null —
  // this already covers Railway-internal traffic, localhost, and any IP the
  // dataset simply doesn't have (see the audit's runtime verification).
  if (!result || !result.country) return UNKNOWN;
  return {
    countryCode: result.country,
    countryName: countryName(result.country),
    region: result.region || null,
    city: result.city || null,
    timezone: result.timezone || null,
  };
}

module.exports = { lookupCoarseGeo, UNKNOWN };
