// Single, centralized place to extract client network addresses from a
// request's headers. Two rules, because two uses need different guarantees.
const net = require('node:net');

// Rate limiting (lib/attemptLimiter.cjs) — security-relevant, so it keys on
// the RIGHTMOST X-Forwarded-For hop: the address Railway's edge itself
// appended, which a client cannot forge. When Railway routes through its
// Fastly CDN that hop is the CDN edge node, not the visitor (verified on
// staging), so buckets can be shared per CDN node; accepted for now rather
// than trusting a client-influenceable position here.
function clientIp(headers) {
  const forwarded = (headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return forwarded[forwarded.length - 1] || headers.get('x-real-ip') || null;
}

// Addresses that can never be the visitor's public address.
const nonPublic = new net.BlockList();
for (const [prefix, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16]]) nonPublic.addSubnet(prefix, bits, 'ipv4');
for (const [prefix, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10]]) nonPublic.addSubnet(prefix, bits, 'ipv6');

// "1.2.3.4", "1.2.3.4:5678", "[2001:db8::1]:443", "::ffff:1.2.3.4" -> bare
// address, or null if it is not a valid IP.
function bareIp(value) {
  let v = String(value || '').trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(v);
  if (bracketed) v = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(v)) v = v.slice(0, v.lastIndexOf(':'));
  const mapped = /^::ffff:(\d{1,3}(\.\d{1,3}){3})$/i.exec(v);
  if (mapped) v = mapped[1];
  return net.isIP(v) ? v : null;
}

function isPublicIp(ip) {
  const family = net.isIP(ip);
  return family !== 0 && !nonPublic.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

// Coarse geolocation only (observational, never used for authorization):
// the LEFTMOST public X-Forwarded-For address is the visitor on both of
// Railway's routing paths; the rightmost can be a CDN edge node (on staging
// a Türkiye visitor was stored as Italy/Brazil that way). A client that
// injects a fake leftmost entry only mislabels its own estimated location.
// Falls back to X-Real-IP, then the rate-limit address. Never persisted.
function clientIpForGeo(headers) {
  for (const entry of (headers.get('x-forwarded-for') || '').split(',')) {
    const ip = bareIp(entry);
    if (ip && isPublicIp(ip)) return ip;
  }
  return bareIp(headers.get('x-real-ip')) || bareIp(clientIp(headers));
}

module.exports = { clientIp, clientIpForGeo };
