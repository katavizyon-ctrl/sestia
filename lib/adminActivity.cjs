// Read-only Admin queries: Accounts → Sessions → visit metadata → product
// activity. Built only from data SESTIA already stores; nothing here writes.
// See docs/reports/SESTIA_ADMIN_USER_ACTIVITY_AND_ANALYTICS_AUDIT_2026-09-29.md.
//
// Ground rules this module encodes:
// - Canonical tables first. Session V2 (sestia_sessions) is the source for
//   logins, sessions and last activity; product tables for product facts;
//   the events table only for what nothing else records (free-chat turns,
//   and the legacy single-item analysis proxy, always marked approximate).
// - Guests are sessions, never people: a guest session's subject_id is a
//   fresh UUID, so guest rows map to exactly one session. No guest session is
//   ever linked to another.
// - Account product rows carry no session_id. They are attributed to a
//   session by time window only, and a row inside two overlapping sessions is
//   reported as ambiguous rather than assigned to one.
// - Content never leaves this module: no conversation, analysis text, item
//   JSON, file names, stacks or credentials are selected. Feedback text is
//   the one deliberate exception (getAccount / recentFeedback only).
// Same factory shape as the other stores so tests can inject their own DB.
const { sqliteUtcToMs, istanbulDayKey, maskEmail } = require('./adminTime.cjs');

const RECOMMENDATIONS = Object.freeze(['tut', 'sat', 'bagisla', 'geri_donustur', 'at']);
const DAY_MS = 24 * 60 * 60 * 1000;
// Product rows are stored at 1-second precision, so a row written in the same
// second a session began can read up to 999ms "before" it.
const TIMESTAMP_TOLERANCE_MS = 1000;
// Consecutive items of these types are shown as one timeline line with a count.
const COLLAPSIBLE = new Set(['room_photo', 'chat_photo', 'chat_message', 'single_analysis']);
const COLLAPSE_GAP_MS = 10 * 60 * 1000;
// Tie-break order for items sharing a timestamp: a login precedes what
// happened in it, the end of a session follows it.
const TYPE_ORDER = ['login', 'room_created', 'room_photo', 'chat_photo', 'room_scan', 'single_analysis',
  'chat_message', 'decision', 'toparla', 'feedback', 'last_interaction', 'session_end'];
// A product row that proves a real action (not just a page load). Used for
// "guest sessions with meaningful activity".
const MEANINGFUL = new Set(['room_created', 'room_photo', 'chat_photo', 'room_scan', 'single_analysis',
  'chat_message', 'decision', 'toparla', 'feedback']);

// Minimal columns only. room_analyses status is derived from NULL-checks so
// no analysis content is ever read; the single-item proxy is recognised by
// the payload's leading key, never by parsing it (payloads may be truncated).
const PRODUCT_SOURCES = [
  ['room_created', `SELECT r.device_id AS owner, r.created_at, r.id AS room_id, r.name AS room_name FROM rooms r`],
  ['room_photo', `SELECT p.device_id AS owner, p.created_at, p.room_id, r.name AS room_name
    FROM room_photos p LEFT JOIN rooms r ON r.id = p.room_id`],
  ['chat_photo', `SELECT device_id AS owner, created_at FROM chat_attachments`],
  ['room_scan', `SELECT a.device_id AS owner, a.created_at, a.room_id, r.name AS room_name,
      CASE WHEN a.confirmation_json IS NOT NULL OR a.final_items_json IS NOT NULL THEN 'confirmed'
           WHEN a.closed = 1 THEN 'closed' ELSE 'open' END AS status
    FROM room_analyses a LEFT JOIN rooms r ON r.id = a.room_id`],
  ['decision', `SELECT d.device_id AS owner, d.created_at, d.recommendation, d.category, d.source,
      d.room_id, COALESCE(r.name, d.room) AS room_name
    FROM decisions d LEFT JOIN rooms r ON r.id = d.room_id`],
  ['chat_message', `SELECT device_id AS owner, created_at FROM events WHERE event_type = 'chat_message'`],
  ['single_analysis', `SELECT device_id AS owner, created_at FROM events
    WHERE event_type = 'ai_suggestion_shown' AND (payload_json IS NULL OR payload_json NOT LIKE '{"items":%')`],
  ['toparla', `SELECT device_id AS owner, created_at, status FROM toparla_results`],
  ['feedback', `SELECT device_id AS owner, created_at, screen FROM feedback`],
];

function parseTestMode(value) {
  return value === 'include' || value === 'only' ? value : 'exclude';
}
function keepByTestMode(mode, isInternal) {
  if (mode === 'include') return true;
  return mode === 'only' ? isInternal : !isInternal;
}

// Effective window in which this session could have produced rows. A session
// ended by 'idle' is closed at its idle deadline even though ended_at_ms is
// only stamped later, when the next session in its browser scope began.
function sessionWindow(row) {
  return {
    start: row.created_at_ms - TIMESTAMP_TOLERANCE_MS,
    end: Math.min(row.ended_at_ms ?? Infinity, row.idle_expires_at_ms),
  };
}

// status: 'active' | 'expired' (computed, idle deadline passed and nothing
// has stamped it yet) | stored end_reason ('logout'|'replaced'|'idle'|'policy').
function sessionStatus(row, now) {
  if (row.ended_at_ms != null) {
    return { status: row.end_reason, endAt: Math.min(row.ended_at_ms, row.idle_expires_at_ms), computed: false };
  }
  if (now >= row.idle_expires_at_ms) return { status: 'expired', endAt: row.idle_expires_at_ms, computed: true };
  return { status: 'active', endAt: null, computed: false };
}

// Which of an account's sessions contains this moment. Never guesses:
// zero matches is 'outside' (pre-Session-V2 or between sessions), more than
// one is 'ambiguous' (e.g. the same account active on two devices).
function attribute(atMs, sessions) {
  const matches = sessions.filter((s) => {
    const w = sessionWindow(s);
    return atMs >= w.start && atMs <= w.end;
  });
  if (matches.length === 1) return { kind: 'exact', sessionIds: [matches[0].id] };
  if (matches.length > 1) return { kind: 'ambiguous', sessionIds: matches.map((s) => s.id) };
  return { kind: 'outside', sessionIds: [] };
}

function emptySummary() {
  return {
    rooms: 0, roomPhotos: 0, chatPhotos: 0,
    roomScans: { total: 0, confirmed: 0, closed: 0, open: 0 },
    decisions: { total: 0, tut: 0, sat: 0, bagisla: 0, geri_donustur: 0, at: 0 },
    chatTurns: 0, singleAnalysesApprox: 0,
    toparla: { total: 0, completed: 0, failed: 0, pending: 0 },
    feedback: 0,
  };
}
function addToSummary(summary, row) {
  switch (row.type) {
    case 'room_created': summary.rooms += 1; break;
    case 'room_photo': summary.roomPhotos += 1; break;
    case 'chat_photo': summary.chatPhotos += 1; break;
    case 'room_scan':
      summary.roomScans.total += 1;
      if (summary.roomScans[row.status] !== undefined) summary.roomScans[row.status] += 1;
      break;
    case 'decision':
      summary.decisions.total += 1;
      if (RECOMMENDATIONS.includes(row.recommendation)) summary.decisions[row.recommendation] += 1;
      break;
    case 'chat_message': summary.chatTurns += 1; break;
    case 'single_analysis': summary.singleAnalysesApprox += 1; break;
    case 'toparla':
      summary.toparla.total += 1;
      if (summary.toparla[row.status] !== undefined) summary.toparla[row.status] += 1;
      break;
    case 'feedback': summary.feedback += 1; break;
    default: break;
  }
  return summary;
}
function summarize(rows) {
  return rows.reduce(addToSummary, emptySummary());
}

function visitView(row) {
  const location = [row.city, row.region, row.country_name].filter(Boolean).join(', ') || null;
  return {
    deviceClass: row.device_class || null, os: row.os || null, browser: row.browser || null,
    location, countryName: row.country_name || null, timezone: row.timezone || null,
    entryPath: row.entry_path || null, referrerHost: row.referrer_host || null,
  };
}

function sessionView(row, now) {
  const { status, endAt, computed } = sessionStatus(row, now);
  return {
    id: row.id.slice(0, 8),
    idFull: row.id, // opaque server-side row id; needed only by the internal/test toggle form
    kind: row.kind,
    subjectShort: row.subject_id.slice(0, 8),
    startedAt: row.created_at_ms,
    lastActivityAt: row.last_activity_at_ms,
    endAt,
    status,
    statusComputed: computed,
    interactionSpanMs: Math.max(0, row.last_activity_at_ms - row.created_at_ms),
    activityReports: row.activity_revision,
    internal: Boolean(row.internal_test),
    visit: visitView(row),
  };
}

// Collapses runs of the same collapsible type (and same detail) into one
// line with a count, so twelve photo uploads do not bury the rest.
function collapseTimeline(items, gapMs = COLLAPSE_GAP_MS) {
  const out = [];
  for (const item of items) {
    const prev = out[out.length - 1];
    if (prev && COLLAPSIBLE.has(item.type) && prev.type === item.type && prev.detail === item.detail &&
        prev.sessionKey === item.sessionKey && item.at - prev.lastAt <= gapMs) {
      prev.count += 1;
      prev.lastAt = item.at;
      continue;
    }
    out.push({ ...item, count: 1, lastAt: item.at });
  }
  return out;
}

function sortTimeline(items) {
  return items.slice().sort((a, b) => (a.at - b.at) || (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)));
}

function createAdminActivity(db, { now: clock = Date.now } = {}) {
  function sessionRows({ kind, subjectId } = {}) {
    const where = [];
    const args = [];
    if (kind) { where.push('s.kind = ?'); args.push(kind); }
    if (subjectId) { where.push('s.subject_id = ?'); args.push(subjectId); }
    return db.prepare(`SELECT s.id, s.family_id, s.family_revision, s.kind, s.subject_id, s.created_at_ms,
        s.last_activity_at_ms, s.idle_expires_at_ms, s.activity_revision, s.ended_at_ms, s.end_reason,
        vm.country_name, vm.region, vm.city, vm.timezone, vm.device_class, vm.os, vm.browser,
        vm.entry_path, vm.referrer_host, COALESCE(vm.internal_test, 0) AS internal_test
      FROM sestia_sessions s LEFT JOIN session_visit_metadata vm ON vm.session_id = s.id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.created_at_ms DESC`).all(...args);
  }

  // Normalized product rows: { type, owner, at (epoch ms), ...minimal fields }.
  function productRows(owner = null) {
    const rows = [];
    for (const [type, sql] of PRODUCT_SOURCES) {
      const stmt = owner === null
        ? db.prepare(sql)
        : db.prepare(`SELECT * FROM (${sql}) WHERE owner = ?`);
      for (const row of (owner === null ? stmt.all() : stmt.all(owner))) {
        const at = sqliteUtcToMs(row.created_at);
        if (at === null) continue;
        const { created_at: _ignored, ...rest } = row;
        rows.push({ type, ...rest, at });
      }
    }
    return rows;
  }

  function groupByOwner(rows) {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.owner)) map.set(row.owner, []);
      map.get(row.owner).push(row);
    }
    return map;
  }

  // Internal/test is an explicit per-session admin flag. A guest owner is
  // internal when its (single) session is; an account counts as internal
  // only when every one of its Session V2 sessions is flagged. Mixed accounts
  // stay included. Pre-Session-V2 owners have no session to flag.
  function internalOwners(sessions) {
    const owners = new Set();
    const accounts = new Map();
    for (const s of sessions) {
      if (s.kind === 'guest') {
        if (s.internal_test) owners.add(s.subject_id);
      } else {
        const a = accounts.get(s.subject_id) || { total: 0, internal: 0 };
        a.total += 1;
        if (s.internal_test) a.internal += 1;
        accounts.set(s.subject_id, a);
      }
    }
    for (const [id, a] of accounts) if (a.total > 0 && a.internal === a.total) owners.add(id);
    return owners;
  }

  function accountRows() {
    return db.prepare(`SELECT a.id, a.email, a.name, a.emailVerified AS email_verified_ms, u.created_at AS users_created_at
      FROM auth_user a LEFT JOIN users u ON u.device_id = a.id`).all();
  }

  function accountSummaryRow(account, sessions, rows) {
    const logins = sessions.map((s) => s.created_at_ms);
    const firstEvidence = [sqliteUtcToMs(account.users_created_at), ...logins, ...rows.map((r) => r.at)]
      .filter(Number.isFinite);
    const latest = sessions[0] || null; // sessionRows() is newest first
    const latestWithVisit = sessions.find((s) => s.device_class || s.os || s.browser || s.country_name) || null;
    const internalSessions = sessions.filter((s) => s.internal_test).length;
    return {
      id: account.id,
      maskedEmail: maskEmail(account.email),
      name: account.name || null,
      firstSeenAt: firstEvidence.length ? Math.min(...firstEvidence) : null,
      firstLoginAt: logins.length ? Math.min(...logins) : null,
      latestLoginAt: logins.length ? Math.max(...logins) : null,
      lastVerifiedEmailAt: Number.isFinite(account.email_verified_ms) ? account.email_verified_ms : null,
      loginCount: sessions.length,
      lastActiveAt: sessions.length ? Math.max(...sessions.map((s) => s.last_activity_at_ms)) : null,
      interactionSpanMs: sessions.reduce((sum, s) => sum + Math.max(0, s.last_activity_at_ms - s.created_at_ms), 0),
      activityReports: sessions.reduce((sum, s) => sum + s.activity_revision, 0),
      latestVisit: latestWithVisit ? visitView(latestWithVisit) : null,
      internalSessions,
      isInternal: sessions.length > 0 && internalSessions === sessions.length,
      preSessionV2Only: sessions.length === 0,
      latestSessionId: latest ? latest.id.slice(0, 8) : null,
      summary: summarize(rows),
    };
  }

  function listAccounts({ testMode = 'exclude' } = {}) {
    const mode = parseTestMode(testMode);
    const sessionsBySubject = groupByOwner(sessionRows({ kind: 'account' }).map((s) => ({ ...s, owner: s.subject_id })));
    const rowsByOwner = groupByOwner(productRows());
    return accountRows()
      .map((a) => accountSummaryRow(a, sessionsBySubject.get(a.id) || [], rowsByOwner.get(a.id) || []))
      .filter((a) => keepByTestMode(mode, a.isInternal))
      .sort((x, y) => (y.lastActiveAt ?? y.lastVerifiedEmailAt ?? 0) - (x.lastActiveAt ?? x.lastVerifiedEmailAt ?? 0));
  }

  function timelineItemsForSessions(sessions, now) {
    const items = [];
    for (const s of sessions) {
      const { status, endAt, computed } = sessionStatus(s, now);
      const own = { sessionKey: s.id, attribution: 'exact', sessionShorts: [s.id.slice(0, 8)] };
      items.push({ type: 'login', at: s.created_at_ms, ...own, detail: s.kind === 'account' ? 'account' : 'guest' });
      if (s.last_activity_at_ms > s.created_at_ms) {
        items.push({ type: 'last_interaction', at: s.last_activity_at_ms, ...own, detail: null });
      }
      if (endAt !== null && endAt <= now) {
        items.push({ type: 'session_end', at: endAt, ...own, detail: status, computed });
      }
    }
    return items;
  }

  function productTimelineItem(row, attribution) {
    const base = { type: row.type, at: row.at, attribution: attribution.kind,
      sessionKey: attribution.kind === 'exact' ? attribution.sessionIds[0] : null,
      sessionShorts: attribution.sessionIds.map((id) => id.slice(0, 8)) };
    switch (row.type) {
      case 'room_created':
      case 'room_photo': return { ...base, detail: row.room_name || null };
      case 'room_scan': return { ...base, detail: row.room_name || null, status: row.status };
      case 'decision': return { ...base, detail: row.category || null, recommendation: row.recommendation,
        source: row.source, room: row.room_name || null };
      case 'toparla': return { ...base, detail: null, status: row.status };
      case 'feedback': return { ...base, detail: row.screen || null };
      case 'single_analysis': return { ...base, detail: null, approximate: true };
      default: return { ...base, detail: null };
    }
  }

  // Per-session product counts for an account, by time window. Rows inside
  // several sessions are counted once as ambiguous on each, never as exact.
  function attributeAccountRows(sessions, rows) {
    const perSession = new Map(sessions.map((s) => [s.id, { exact: [], ambiguous: [] }]));
    let outside = 0;
    let ambiguous = 0;
    const attributions = rows.map((row) => {
      const a = attribute(row.at, sessions);
      if (a.kind === 'exact') perSession.get(a.sessionIds[0]).exact.push(row);
      else if (a.kind === 'ambiguous') { ambiguous += 1; for (const id of a.sessionIds) perSession.get(id).ambiguous.push(row); }
      else outside += 1;
      return a;
    });
    return { perSession, attributions, totals: { exact: rows.length - outside - ambiguous, ambiguous, outside } };
  }

  function getAccount(id) {
    const now = clock();
    const account = accountRows().find((a) => a.id === id);
    if (!account) return null;
    const sessions = sessionRows({ kind: 'account', subjectId: id });
    const rows = productRows(id);
    const { perSession, attributions, totals } = attributeAccountRows(sessions, rows);
    const timeline = collapseTimeline(sortTimeline([
      ...timelineItemsForSessions(sessions, now),
      ...rows.map((row, i) => productTimelineItem(row, attributions[i])),
    ]));
    const feedback = db.prepare('SELECT created_at, screen, message FROM feedback WHERE device_id = ? ORDER BY id DESC')
      .all(id).map((f) => ({ at: sqliteUtcToMs(f.created_at), screen: f.screen || null, message: f.message }));
    return {
      // Full email only here, on the per-account detail page, for support.
      account: { ...accountSummaryRow(account, sessions, rows), email: account.email },
      sessions: sessions.map((s) => ({
        ...sessionView(s, now),
        counts: summarize(perSession.get(s.id).exact),
        ambiguousCount: perSession.get(s.id).ambiguous.length,
        ambiguousCounts: summarize(perSession.get(s.id).ambiguous),
      })),
      attributionTotals: totals,
      timeline,
      feedback,
    };
  }

  // The Sessions / Visits table. Guest counts are exact (owner ≡ session);
  // account counts are time-window attributed, with ambiguity reported.
  function listSessions({ kind = 'all', testMode = 'exclude', limit = 100 } = {}) {
    const now = clock();
    const mode = parseTestMode(testMode);
    const all = sessionRows();
    const cap = Math.max(1, Math.min(200, Number(limit) || 100));
    const visible = all
      .filter((s) => (kind === 'guest' || kind === 'account' ? s.kind === kind : true))
      .filter((s) => keepByTestMode(mode, Boolean(s.internal_test)))
      .slice(0, cap);
    const rowsByOwner = groupByOwner(productRows());
    const accountSessions = groupByOwner(all.filter((s) => s.kind === 'account').map((s) => ({ ...s, owner: s.subject_id })));
    const accountAttribution = new Map();
    const emails = new Map(accountRows().map((a) => [a.id, a.email]));
    return visible.map((s) => {
      const view = sessionView(s, now);
      if (s.kind === 'guest') {
        return { ...view, accountId: null, maskedEmail: null, attribution: 'exact',
          counts: summarize(rowsByOwner.get(s.subject_id) || []), ambiguousCount: 0, ambiguousCounts: emptySummary() };
      }
      if (!accountAttribution.has(s.subject_id)) {
        accountAttribution.set(s.subject_id,
          attributeAccountRows(accountSessions.get(s.subject_id) || [], rowsByOwner.get(s.subject_id) || []));
      }
      const { perSession } = accountAttribution.get(s.subject_id);
      return { ...view, accountId: s.subject_id, maskedEmail: maskEmail(emails.get(s.subject_id)),
        attribution: 'time_window', counts: summarize(perSession.get(s.id).exact),
        ambiguousCount: perSession.get(s.id).ambiguous.length, ambiguousCounts: summarize(perSession.get(s.id).ambiguous) };
    });
  }

  function overview({ testMode = 'exclude', days = 7 } = {}) {
    const now = clock();
    const mode = parseTestMode(testMode);
    const cutoff = now - days * DAY_MS;
    const sessions = sessionRows();
    const keptSessions = sessions.filter((s) => keepByTestMode(mode, Boolean(s.internal_test)));
    const internal = internalOwners(sessions);
    const rows = productRows();
    const keptRows = rows.filter((r) => keepByTestMode(mode, internal.has(r.owner)));
    const meaningfulOwners = new Set(rows.filter((r) => MEANINGFUL.has(r.type)).map((r) => r.owner));

    const recentAccountSessions = keptSessions.filter((s) => s.kind === 'account' && s.last_activity_at_ms >= cutoff);
    const recentGuestSessions = keptSessions.filter((s) => s.kind === 'guest' && s.last_activity_at_ms >= cutoff);
    // Conversion = an account session established in the same browser scope
    // right after a guest session. It links exactly those two sessions; no
    // guest is ever followed further back.
    const guestByFamily = new Map();
    for (const s of keptSessions) if (s.kind === 'guest') {
      if (!guestByFamily.has(s.family_id)) guestByFamily.set(s.family_id, []);
      guestByFamily.get(s.family_id).push(s.family_revision);
    }
    const conversions = keptSessions.filter((s) => s.kind === 'account' && s.created_at_ms >= cutoff &&
      (guestByFamily.get(s.family_id) || []).includes(s.family_revision - 1)).length;

    const sessionSubjects = new Set(sessions.map((s) => s.subject_id));
    const accountIds = new Set(accountRows().map((a) => a.id));
    const preSessionV2Owners = new Set(rows.map((r) => r.owner)
      .filter((o) => !sessionSubjects.has(o) && !accountIds.has(o))).size;

    const dayKeys = [];
    for (let i = days - 1; i >= 0; i -= 1) dayKeys.push(istanbulDayKey(now - i * DAY_MS));
    const daily = new Map(dayKeys.map((k) => [k, 0]));
    for (const r of keptRows) {
      if (r.type !== 'decision' || r.at < now - days * DAY_MS - DAY_MS) continue;
      const key = istanbulDayKey(r.at);
      if (daily.has(key)) daily.set(key, daily.get(key) + 1);
    }

    return {
      days,
      activeAccounts: new Set(recentAccountSessions.map((s) => s.subject_id)).size,
      accountLogins: keptSessions.filter((s) => s.kind === 'account' && s.created_at_ms >= cutoff).length,
      guestSessions: recentGuestSessions.length,
      meaningfulGuestSessions: recentGuestSessions.filter((s) => meaningfulOwners.has(s.subject_id)).length,
      conversions,
      preSessionV2Owners,
      totals: summarize(keptRows),
      dailyDecisions: dayKeys.map((day) => ({ day, count: daily.get(day) })),
    };
  }

  function ownerEmails() {
    return new Map(accountRows().map((a) => [a.id, a.email]));
  }

  function recentFeedback({ limit = 50, testMode = 'exclude' } = {}) {
    const mode = parseTestMode(testMode);
    const internal = internalOwners(sessionRows());
    const emails = ownerEmails();
    return db.prepare('SELECT device_id, message, screen, created_at FROM feedback ORDER BY id DESC').all()
      .filter((f) => keepByTestMode(mode, internal.has(f.device_id)))
      .slice(0, limit)
      .map((f) => ({ at: sqliteUtcToMs(f.created_at), screen: f.screen || null, message: f.message,
        accountId: emails.has(f.device_id) ? f.device_id : null, maskedEmail: maskEmail(emails.get(f.device_id)),
        ownerShort: f.device_id ? f.device_id.slice(0, 8) : null }));
  }

  // Message and screen only — the stack is never read.
  function recentErrors({ limit = 50, testMode = 'exclude' } = {}) {
    const mode = parseTestMode(testMode);
    const internal = internalOwners(sessionRows());
    const emails = ownerEmails();
    return db.prepare('SELECT device_id, message, screen, created_at FROM errors ORDER BY id DESC').all()
      .filter((e) => keepByTestMode(mode, internal.has(e.device_id)))
      .slice(0, limit)
      .map((e) => ({ at: sqliteUtcToMs(e.created_at), screen: e.screen || null, message: e.message,
        maskedEmail: maskEmail(emails.get(e.device_id)), ownerShort: e.device_id ? e.device_id.slice(0, 8) : null }));
  }

  return { listAccounts, getAccount, listSessions, overview, recentFeedback, recentErrors };
}

module.exports = {
  createAdminActivity, parseTestMode, attribute, sessionStatus, collapseTimeline, summarize,
  RECOMMENDATIONS, PRODUCT_SOURCES,
};
