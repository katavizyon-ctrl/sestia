const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { createVisitMetadataStore } = require('../lib/visitMetadataStore.cjs');

function fixture() {
  const db = new Database(':memory:');
  return { db, store: createVisitMetadataStore(db) };
}

test('record: writes exactly one row per session, with fields intact', () => {
  const { db, store } = fixture();
  store.record('session-1', { countryCode: 'TR', countryName: 'Türkiye', deviceClass: 'mobile', os: 'iOS', browser: 'Safari' });
  const row = store.get('session-1');
  assert.equal(row.country_code, 'TR');
  assert.equal(row.device_class, 'mobile');
  assert.equal(row.internal_test, 0, 'defaults to not-internal, never inferred');
  db.close();
});

test('record: a duplicate call for the same session (e.g. a retried establishment) never overwrites the first-recorded row', () => {
  const { db, store } = fixture();
  store.record('session-1', { countryCode: 'TR' });
  store.record('session-1', { countryCode: 'US' }); // simulated retry with different (wrong) inferred data
  assert.equal(store.get('session-1').country_code, 'TR', 'first recording wins; not silently overwritten');
  db.close();
});

test('unknown/absent fields are stored as NULL, never fabricated', () => {
  const { db, store } = fixture();
  store.record('session-2', {});
  const row = store.get('session-2');
  for (const col of ['country_code', 'country_name', 'region', 'city', 'timezone', 'device_class', 'os', 'browser', 'entry_path', 'referrer_host']) {
    assert.equal(row[col], null, `${col} should be null, not fabricated`);
  }
  db.close();
});

test('setInternalTest: explicit admin classification, upserts even if no prior row exists', () => {
  const { db, store } = fixture();
  assert.equal(store.get('session-3'), null, 'no row yet');
  store.setInternalTest('session-3', true);
  assert.equal(store.get('session-3').internal_test, 1);
  store.setInternalTest('session-3', false);
  assert.equal(store.get('session-3').internal_test, 0, 'unmark works too');
});

test('setInternalTest: does not disturb an already-recorded row\'s other fields', () => {
  const { db, store } = fixture();
  store.record('session-4', { countryCode: 'TR', deviceClass: 'desktop' });
  store.setInternalTest('session-4', true);
  const row = store.get('session-4');
  assert.equal(row.country_code, 'TR');
  assert.equal(row.device_class, 'desktop');
  assert.equal(row.internal_test, 1);
  db.close();
});

test('no raw IP column exists in the schema at all', () => {
  const { db } = fixture();
  const columns = db.prepare('PRAGMA table_info(session_visit_metadata)').all().map((c) => c.name);
  assert.equal(columns.some((c) => /ip/i.test(c)), false, 'the schema must never carry a raw-IP column');
  db.close();
});
