// Additive, observational metadata describing HOW a Session V2 session came
// to exist — never a permanent human identity profile. One row per
// session_id, written exactly once at session establishment. See
// docs/reports/SESTIA_VISITOR_SESSION_METADATA_OBSERVABILITY_AUDIT.md.
//
// Deliberately its own table, separate from sestia_sessions/
// sestia_session_families (lib/sessionStore.cjs) — this keeps the
// already-reviewed session-authority schema untouched, per the pre-
// implementation review's recommendation. Nothing here is ever consulted for
// authorization/activity; a missing or failed row must never affect a
// session's validity.
function createVisitMetadataStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS session_visit_metadata (
    session_id TEXT PRIMARY KEY,
    captured_at_ms INTEGER NOT NULL,
    country_code TEXT,
    country_name TEXT,
    region TEXT,
    city TEXT,
    timezone TEXT,
    device_class TEXT,
    os TEXT,
    os_version TEXT,
    browser TEXT,
    browser_version TEXT,
    entry_path TEXT,
    referrer_host TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    internal_test INTEGER NOT NULL DEFAULT 0,
    metadata_source_version INTEGER NOT NULL DEFAULT 1
  )`);

  // INSERT OR IGNORE: a session's visit metadata is recorded once, at
  // establishment; a duplicate call (e.g. a retried establishment request
  // that hit the store's own idempotent-creation-key path) must never
  // overwrite or duplicate the first-recorded row.
  function record(sessionId, fields = {}) {
    db.prepare(`INSERT OR IGNORE INTO session_visit_metadata (
      session_id, captured_at_ms, country_code, country_name, region, city, timezone,
      device_class, os, os_version, browser, browser_version,
      entry_path, referrer_host, utm_source, utm_medium, utm_campaign
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      sessionId, fields.capturedAtMs ?? Date.now(),
      fields.countryCode ?? null, fields.countryName ?? null, fields.region ?? null, fields.city ?? null, fields.timezone ?? null,
      fields.deviceClass ?? null, fields.os ?? null, fields.osVersion ?? null, fields.browser ?? null, fields.browserVersion ?? null,
      fields.entryPath ?? null, fields.referrerHost ?? null, fields.utmSource ?? null, fields.utmMedium ?? null, fields.utmCampaign ?? null,
    );
  }

  function get(sessionId) {
    return db.prepare('SELECT * FROM session_visit_metadata WHERE session_id = ?').get(sessionId) || null;
  }

  // Admin-only, explicit classification — never set automatically from IP,
  // geo, device, or timing. Operational metadata only: verified not to
  // affect authorization anywhere it is read (lib/session.js never consults
  // this table). Upserts so a session whose original capture failed/
  // predates this feature can still be classified.
  function setInternalTest(sessionId, isInternal) {
    db.prepare(`INSERT INTO session_visit_metadata (session_id, captured_at_ms, internal_test)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET internal_test = excluded.internal_test`)
      .run(sessionId, Date.now(), isInternal ? 1 : 0);
  }

  return { record, get, setInternalTest };
}

module.exports = { createVisitMetadataStore };
