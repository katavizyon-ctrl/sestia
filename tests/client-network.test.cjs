const test = require('node:test');
const assert = require('node:assert/strict');
const { clientIp, clientIpForGeo } = require('../lib/clientNetwork.cjs');
const { lookupCoarseGeo } = require('../lib/geo.cjs');

const h = (map) => new Headers(map);
const TR = '85.105.1.1'; // geoip-lite: Türkiye (Istanbul)
const CDN = '151.101.1.1'; // geoip-lite: US (Fastly range)

test('geo uses the leftmost public X-Forwarded-For address, not a trailing CDN/proxy hop', () => {
  // The staging bug: "visitor, cdn-edge" was geolocated from the CDN edge.
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': `${TR}, ${CDN}` })), TR);
  assert.equal(lookupCoarseGeo(clientIpForGeo(h({ 'x-forwarded-for': `${TR}, ${CDN}` }))).countryCode, 'TR');
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': TR })), TR, 'single entry');
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': ` ${TR} ,  ${CDN} ` })), TR, 'whitespace');
});

test('geo skips private, loopback, link-local, CGNAT and malformed entries', () => {
  for (const junk of ['10.1.2.3', '192.168.0.9', '172.20.1.1', '127.0.0.1', '169.254.1.1', '100.64.3.4', '0.0.0.0',
    '::1', 'fd00::1', 'fe80::1', 'unknown', '', 'not-an-ip', '999.1.1.1']) {
    assert.equal(clientIpForGeo(h({ 'x-forwarded-for': `${junk}, ${TR}, ${CDN}` })), TR, `skips ${junk || '(empty)'}`);
  }
});

test('geo accepts IPv6, bracketed/port forms and IPv4-mapped IPv6', () => {
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': '2a02:ff0::1, 151.101.1.1' })), '2a02:ff0::1');
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': '[2a02:ff0::1]:443' })), '2a02:ff0::1');
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': `${TR}:51234, ${CDN}` })), TR);
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': `::ffff:${TR}` })), TR);
});

test('geo falls back to X-Real-IP, then null — and never throws', () => {
  assert.equal(clientIpForGeo(h({ 'x-real-ip': TR })), TR);
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': '10.0.0.1', 'x-real-ip': TR })), TR, 'only private XFF entries');
  assert.equal(clientIpForGeo(h({})), null);
  assert.equal(clientIpForGeo(h({ 'x-forwarded-for': 'garbage, , ,' })), null);
});

test('rate-limit key is unchanged: still the rightmost X-Forwarded-For hop (not client-forgeable)', () => {
  assert.equal(clientIp(h({ 'x-forwarded-for': `${TR}, ${CDN}` })), CDN);
  assert.equal(clientIp(h({ 'x-forwarded-for': `203.0.113.9, ${TR}` })), TR, 'a client-supplied leftmost entry cannot choose the key');
  assert.equal(clientIp(h({ 'x-real-ip': TR })), TR);
  assert.equal(clientIp(h({})), null);
});
