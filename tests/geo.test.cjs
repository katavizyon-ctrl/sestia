// No live/remote geo API is ever involved (lib/geo.cjs only reads the
// locally-bundled geoip-lite dataset, in-process). Asserts structural
// behavior rather than an exact country for a given public IP, so this test
// does not become brittle if the bundled dataset is ever updated.
const test = require('node:test');
const assert = require('node:assert/strict');
const { lookupCoarseGeo, UNKNOWN } = require('../lib/geo.cjs');

test('a valid public IPv4 resolves to a non-empty coarse country (never raw IP in the result)', () => {
  const result = lookupCoarseGeo('8.8.8.8');
  assert.ok(result.countryCode, 'expected a resolved country code for a well-known public IP');
  assert.equal(typeof result.countryCode, 'string');
  assert.equal(JSON.stringify(result).includes('8.8.8.8'), false, 'the input IP must never appear in the returned object');
});

test('a valid public IPv6 address is also supported', () => {
  const result = lookupCoarseGeo('2001:4860:4860::8888');
  assert.ok(result.countryCode, 'expected IPv6 lookup to resolve a country');
});

test('private/loopback/reserved IPs degrade to unknown, never throw', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '::1', 'fe80::1']) {
    assert.deepEqual(lookupCoarseGeo(ip), UNKNOWN, `expected unknown for ${ip}`);
  }
});

test('malformed/missing input degrades to unknown, never throws', () => {
  assert.deepEqual(lookupCoarseGeo('not-an-ip'), UNKNOWN);
  assert.deepEqual(lookupCoarseGeo(''), UNKNOWN);
  assert.deepEqual(lookupCoarseGeo(null), UNKNOWN);
  assert.deepEqual(lookupCoarseGeo(undefined), UNKNOWN);
  assert.deepEqual(lookupCoarseGeo(12345), UNKNOWN);
});

test('country name is localized (Turkish) via Intl.DisplayNames, not a raw code, when resolvable', () => {
  const result = lookupCoarseGeo('8.8.8.8');
  if (result.countryCode) {
    assert.notEqual(result.countryName, null);
    assert.notEqual(result.countryName, result.countryCode, 'expected a human-readable name, not the bare ISO code');
  }
});

test('result never includes precise coordinates or raw dataset fields (coarse fields only)', () => {
  const result = lookupCoarseGeo('8.8.8.8');
  assert.deepEqual(Object.keys(result).sort(), ['city', 'countryCode', 'countryName', 'region', 'timezone'].sort());
});
