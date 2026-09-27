# SESTIA — Visitor / Session Metadata Observability Audit

**Status:** READ-ONLY AUDIT. No application code, test, schema, dependency, or configuration was modified. Nothing was committed, deployed, pushed, or changed on Railway/environment variables. No AI/email provider was called. The only "traffic" generated was a single, real, unauthenticated `GET /api/health` against staging via `curl` — a public, side-effect-free endpoint that already exists and is hit routinely by health checks; no application state changed.

For every technical claim below, one of four labels is used, exactly as requested: **VERIFIED IN CURRENT REPO** (read directly from source in this repository), **VERIFIED IN STAGING/RUNTIME** (observed directly against the live deployment during this audit), **DOCUMENTED EXTERNAL BEHAVIOR** (general, well-established platform/library behavior not independently re-tested here), and **RECOMMENDATION** (this audit's proposal, not a fact).

---

## 1. Executive Conclusion

Railway's edge does not provide any client geolocation header today (**VERIFIED IN STAGING/RUNTIME** for the response side, **VERIFIED IN CURRENT REPO** by total absence in a codebase that already relies on precisely this class of header elsewhere). It does provide a trustworthy client IP via `X-Forwarded-For`'s last hop — not a new discovery, but an already-shipped, already-relied-upon fact in this exact codebase (`lib/attemptLimiter.cjs`). No User-Agent-parsing dependency exists yet, and none is needed for the coarse device/OS/browser classes this task asks for — a small hand-rolled classifier (in the same minimal-dependency style as the rest of this codebase's crypto/parsing helpers) is sufficient. No referrer/UTM/entry-path capture exists anywhere today. No historical geo/device/referrer metadata exists for any past visit — it was simply never captured, not hidden or deleted. The correct capture point for any of this is **session establishment**, which does not yet exist as a clean, atomic event in the current architecture — it only exists in the **already-approved, not-yet-implemented** Session V2 design. The recommendation in this report is therefore to design the schema now, but implement capture as part of (immediately after) Session V2, hanging one new, small, additive table off Session V2's session-establishment moment — not before, and not by retrofitting it onto today's rolling-renewal guest model.

---

## 2. Current Request/Network Architecture

**VERIFIED IN CURRENT REPO.** Every request to the deployed app passes through `proxy.js` (Next.js 16's Proxy/middleware) before reaching any route handler, gated first by `access_ok`, then (today) by the guest-cookie renewal block. `proxy.js` and every route handler run in the Node.js runtime (`export const runtime = 'nodejs'`, confirmed on every relevant route file), not the Edge runtime — this matters because it means standard Node `Request`/`Headers` objects are available everywhere, with no Edge-runtime restrictions on what can be read or computed. `lib/identity.js`'s `getIdentity()` is the sole identity resolver used by every protected route. `/api/event` (`app/api/event/route.js`) is the sole telemetry ingestion point, writing to the `events` table via `lib/db.js`'s `logEvent()`, gated by a fixed six-value allowlist (`ALLOWED_EVENT_TYPES`). `app/admin/page.js` is the sole existing admin surface, gated by a separate `admin_ok` cookie, itself a Server Component that calls plain synchronous `lib/db.js` query functions — no separate admin API layer exists.

---

## 3. Railway Metadata Actually Available

**VERIFIED IN CURRENT REPO:** `lib/attemptLimiter.cjs`'s `clientKey(headers)` function, already shipped and relied upon in production for brute-force protection on the access code, reads `x-forwarded-for` and documents, in its own comment: *"Railway's edge appends the connecting address last; take the last hop so a client-supplied X-Forwarded-For value cannot be used to rotate identities."* This is not this audit's claim — it's an existing, already-battle-tested fact this codebase already depends on. It falls back to `x-real-ip`, then `'unknown'`.

**VERIFIED IN STAGING/RUNTIME:** a live `curl -sD - https://sestia-test-staging.up.railway.app/api/health` performed during this audit returned:
```
Server: railway-hikari
x-railway-request-id: qAjfTVf8S_OoeJX3LPU1MQ
x-hikari-trace: ams1.9qww
x-railway-edge: ams1
```
No `cf-ipcountry`, `x-vercel-ip-country`, or any comparably-named geo header was present. `ams1` identifies **Railway's own edge point-of-presence** (Amsterdam) that served the request — this is infrastructure/routing metadata about Railway's own network, not the visitor's location, and must never be confused with visitor geo.

**VERIFIED IN CURRENT REPO (by absence):** grepping the entire application source for any geo-related header name (`cf-ip*`, `x-geo*`, `x-vercel-ip-*`) returns zero matches, and the installed Next.js 16.3.5's `NextRequest` adapter source (`node_modules/next/dist/server/web/spec-extension/adapters/next-request.js`) contains only **comments** reading `// geo` / `// ip` at the exact positions where Vercel's proprietary `NextRequest.geo`/`NextRequest.ip` properties used to be implemented in older Next.js versions — confirming these properties have been **removed from the framework entirely** in this version, not merely absent on this platform. Next.js's own bundled docs for `NextRequest` (`node_modules/next/dist/docs/.../next-request.md`) make no mention of `.ip` or `.geo` at all.

**Conclusion:** Railway supplies a trustworthy client IP (last `X-Forwarded-For` hop) and nothing else geo-related. Any country/region/city must be derived by the **application itself**, from that IP, using its own logic or a bundled dataset — there is no platform shortcut available on this stack, confirmed both by direct source inspection and a live runtime check.

---

## 4. IP / Coarse Geo Findings

| Approach | Accuracy | Limitations | Privacy | Cost | External dependency | Latency | Raw IP storage needed? |
|---|---|---|---|---|---|---|---|
| **A. Infrastructure-provided geo** | N/A | **Does not exist on Railway** (Section 3) | N/A | N/A | N/A | N/A | N/A |
| **B1. Third-party geo API call per request** (e.g. ipinfo.io, ip-api.com) | Country: good. City: moderate, degrades under CGNAT/mobile/VPN | Adds a network round-trip on a path that must never block entry (Section 12); the third party sees every visitor's real IP, which this project has not evaluated as a data processor | Sends visitor IP to an external company on every visit | Usually free tier for low volume, cost/rate-limits at scale | **Yes — a live external service in the request path** | Real, non-trivial (must be strictly async/fire-and-forget, never gate the response) | Not required to persist, but the third party receives it live regardless |
| **B2. Local/bundled GeoIP database** (e.g. MaxMind GeoLite2 or the npm `geoip-lite` package, which bundles its own data file) | Country: good. City: coarse/approximate, weaker than commercial-grade data, degrades under CGNAT/VPN/carrier NAT exactly like any IP-based method | Bundled data file needs periodic updates (weeks–months staleness is normal and acceptable for this use case); no live network dependency | **No IP ever leaves the server** — lookup is a local, in-process table read | One-time dependency + occasional data refresh; zero per-request cost | A dependency to add later (not installed today — **VERIFIED IN CURRENT REPO**, `node_modules` has no `geoip-lite`/`maxmind`/similar package) | Effectively zero (local lookup, sub-millisecond) | **No** — only derived `country_code`/`region`/`city` need to persist |
| **C. No geo at all** | N/A | Loses country/city visibility | Maximal — no IP-derived data of any kind | Zero | None | Zero | N/A |

**Expected inaccuracies, regardless of method (B1/B2):** VPNs and corporate networks resolve to the VPN/office exit point, not the visitor; mobile carrier NAT and CGNAT can resolve an entire carrier's traffic to one regional or even national location; IPv6 allocations are geolocated with generally worse precision than IPv4 in most free/bundled datasets; and any geo database has inherent staleness/error versus ground truth. **City-level accuracy should always be presented as estimated, never as fact** — this audit recommends the eventual admin UI literally label it "yaklaşık konum" (estimated location) rather than a bare city name.

**Recommendation:** if geo is ever added, **B2 (local bundled database, e.g. `geoip-lite`)** is the only approach consistent with this project's stated preferences — no raw IP needs to persist, no third party receives visitor IPs, no per-request external call risks latency or availability. **For the current stage, this audit recommends not enabling geo capture at all yet** (Section 18) — with ~4 testers, the marginal operational value is low relative to even the small cost of a new dependency, and the schema can hold `country_code`/`region`/`city` as `NULL`/"unknown" from day one so enabling it later needs zero migration.

---

## 5. User-Agent/Device Findings

**VERIFIED IN CURRENT REPO:** no User-Agent parsing exists anywhere today, and no UA-parsing package (`ua-parser-js`, `bowser`, `useragent`, or similar) is present in `node_modules`, even transitively. The standard `User-Agent` request header is fully available on every request today (it's a plain Web `Headers` read, no framework restriction), it's simply never read.

For the **coarse, non-fingerprinting** classes this task asks for (`device_class`: desktop/mobile/tablet/unknown; `os`: Windows/macOS/iOS/Android/Linux/unknown; `browser`: Chrome/Safari/Firefox/Edge/unknown; optional major-version-only `os_version`/`browser_version`), a small hand-written classifier — a short ordered list of substring/regex checks against the `User-Agent` string — is entirely sufficient and matches this codebase's existing style of writing small, dependency-free parsers for exactly this kind of bounded problem (compare `lib/attemptLimiter.cjs`, `lib/accessToken.cjs`, `lib/guestToken.js`, none of which reach for a library where a dozen lines suffice). **Recommendation: do not add a UA-parsing dependency.** A `~40`-line internal helper (e.g. `lib/userAgentClass.cjs`) covering the half-dozen browser/OS tokens actually likely to appear in this app's real traffic is the right-sized solution — precise version-level fingerprinting is explicitly not the goal and was explicitly ruled out by the task.

**Important boundary, stated explicitly as instructed:** classifying User-Agent into `{device_class, os, browser}` and optionally a major version is coarse categorization, not fingerprinting, **as long as** these three-to-five low-entropy fields are the only things derived and persisted — combining them with additional entropy-rich signals (installed fonts, canvas/WebGL hashes, exact plugin lists, precise minor version chains, screen resolution, timezone offset, etc.) would cross into fingerprinting territory and must not be added. This audit recommends stopping exactly at the coarse fields requested.

---

## 6. Referrer/Entry-Source Findings

**VERIFIED IN CURRENT REPO:** no `Referer` header is read anywhere server-side, no `document.referrer` is read anywhere client-side, and no UTM/query-parameter capture exists anywhere (`useSearchParams` appears only in `app/page.js` and `app/api/rooms/[id]/scan/route.js`, both unrelated to entry tracking — used for the room-scan feature's own parameters, not marketing/referrer attribution). `app/layout.js` is a minimal Server Component with no analytics script or referrer capture of any kind.

**DOCUMENTED EXTERNAL BEHAVIOR:** the `Referer` header is well known to be frequently absent or stripped — same-site navigations, `rel="noreferrer"` links, many privacy-respecting browsers/extensions, and cross-origin HTTPS→HTTPS-with-stricter-policy transitions can all suppress it. **It must never be treated as reliably present**; "unknown" is a normal, expected outcome, not an error.

**Recommendation:** if entry-source capture is added, capture only: (a) the first pathname of the visit (low value here — this is a single-page app, nearly everything is `/`, but free to record), (b) the `Referer` header's **hostname only** (never the full URL, which can carry another site's own query string/session tokens), and (c) a small, explicit allowlist of known UTM-style keys (`utm_source`, `utm_medium`, `utm_campaign`) read individually from the entry query string **by name** — never store the raw query string wholesale, since an arbitrary query string could carry anything (accidentally pasted tokens, email-link parameters, etc.) that has no business being retained.

---

## 7. Historical Metadata Availability

Searched actual staging DB tables (`events.payload_json` contents inspected by shape, not content), `lib/telemetry.js`, and every route that could plausibly have written request metadata:

**HISTORICALLY AVAILABLE:** nothing. `events.payload_json` bodies are limited to the six existing event types' own small, product-specific payloads (e.g. `{screen}`, `{category, recommendation}`, `{turn}}`) — no IP, User-Agent, geo, or referrer was ever included in any payload, past or present (**VERIFIED IN CURRENT REPO**: `lib/telemetry.js`'s `logEvent`/`reportError` construct their bodies from only `eventType`/`payload` or `message`/`stack`/`screen` — no header value is ever attached client-side, and the server-side `logEvent()` in `lib/db.js` never reads request headers either). Application logs on Railway are the only other conceivable source and were not inspected as part of this read-only audit (Railway's log retention window is typically short and was not assumed); even if they contained raw request lines, extracting/reconstructing per-visit geo/device/referrer from raw logs after the fact would be a manual, one-off forensic exercise, not a reliable data source, and is not recommended as a plan.

**ONLY AVAILABLE AFTER NEW CAPTURE IS IMPLEMENTED:** every single field discussed in this report — IP-derived geo, device/OS/browser class, referrer, entry path, UTM. **Stated plainly, as instructed: none of it exists for any past visit.** This report's recommendation is exclusively forward-looking.

---

## 8. Session V2 Integration

Per instruction, `docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md` was **not modified**, and this section does not redesign it — it only recommends where new, additive observability data should attach.

Kept explicitly distinct, per the four-concept framing this task requires:

- **Data owner / application identity** (`device_id` today; `subject_id` under Session V2): the durable thing that owns rooms/photos/decisions. Visitor metadata does **not** belong here — an account owner can have many future sessions from many different devices/locations over time, and overwriting owner-level fields with "the last device/location seen" would silently lose history and misrepresent the owner as a single fixed device/place.
- **Session/lifecycle** (does not exist as a table today; under V2, one row per lifecycle in `sestia_sessions`, with a real, atomic "established" moment): **this is the correct attachment point.** A session is bounded, is created exactly once per lifecycle, and is exactly the granularity a "visit" actually means in this app (a guest's post-timeout new lifecycle is, correctly, a new "visit" in observability terms too — it's genuinely a fresh, disjoint browser session from the server's point of view, even though it isn't a new human).
- **Meaningful product activity:** orthogonal, already covered by the prior activity-visibility audit; unaffected by this report.
- **Visitor metadata (new concept):** request-time-derived facts about how a particular session came to exist — device class, OS, browser, coarse geo, referrer/entry path. One row per session, captured once, never updated afterward (a session's device/browser/geo do not change mid-lifecycle in any way worth tracking for this stage).

**Recommendation: do not add these columns to the already-specified `sestia_sessions`/`sestia_session_families` tables.** Add a **new, separate, additive table** (e.g. `session_visit_metadata`, one row per `session_id`, foreign-keyed once `sestia_sessions` exists) populated exactly once, at the same moment `lib/sessionStore.cjs`'s `guest()`/`account()` establishment functions create a new session row (Section 12/13). This keeps the core session-authority table (already reviewed, tested, and approved) untouched — satisfying "do not redesign Session V2" literally — while giving observability its own clearly-scoped home.

**Why not capture this today, before Session V2 ships:** today's architecture has no atomic "a new session began" event — the current guest model is a rolling-renewal cookie with no clean establishment boundary (every qualifying request re-signs the same or a fresh cookie; there is no single moment analogous to Session V2's `guest()`/`account()` calls). Bolting visit-metadata capture onto today's model would mean either capturing it on every renewed request (wrong — that's not "a visit," that's "every request") or inventing a fragile, race-prone "first time we've seen this device_id" heuristic — precisely the class of problem Session V2's atomic family/session establishment already solves correctly for identity. **This audit recommends waiting** for Session V2's session-establishment endpoints and hanging visit-metadata capture directly off them, rather than building and then discarding an interim mechanism.

---

## 9. Internal/Test Traffic Model

Per instruction, this is conceptual only — an explicit **admin-set classification**, never automatic inference from IP/geo/device/timing.

**Recommended location: primarily on the SESSION, with an optional secondary flag on the ACCOUNT owner record for convenience.**

- **Session-level flag** (`is_internal_test` — nullable boolean, default `NULL`/unclassified, settable only from the admin view): this is the only mechanism that works for **guests**, since under Session V2 a new guest gets a brand-new `subject_id` every time its session expires — there is no stable "owner" to mark once for a guest. Every guest test session the owner runs would need its own explicit mark, which is honest and correct: it reflects that these really are different, disjoint identities from the server's point of view, even when it's the same human retesting.
- **Optional owner-level flag** (a small new column or side-table keyed by `auth_user.id`, e.g. `is_known_internal_account`): useful **only for accounts**, where the same `auth_user.id` persists across many sessions — marking a known internal/dev account once lets its **future** sessions default to "internal" automatically at creation time (still visible and overridable per-session in the admin view, never hidden). This is a convenience layered on top of the session-level source of truth, not a replacement for it.

**Safest model, stated plainly:** the SESSION flag is authoritative and sufficient on its own; the ACCOUNT-level flag is a pure convenience default for the one identity type (accounts) where "the same underlying tester" is actually knowable without inference. Neither flag is ever set automatically from IP, geo, device class, or timing correlation — only by an explicit admin action.

---

## 10. Admin Observability Design

`app/admin/page.js` (**VERIFIED IN CURRENT REPO**, read in full) is a single Server Component, gated by the separate `admin_ok` cookie checked in `proxy.js`, calling plain synchronous query functions from `lib/db.js` (`getActiveDeviceCount`, `getDailyUsage`, `getTesterAccounts`, `getRecentFeedback`, `getRecentErrors`) and rendering them through two small reusable presentational components already defined in the same file (`DailyBarChart`, `RecordTable`).

**Recommendation: extend this exact page with one more section, reusing `RecordTable` verbatim** — consistent with the prior activity-visibility audit's recommendation and this project's established minimal-surface pattern. Do not create a second admin route, page, or gate.

Conceptual (not implemented) row shape for a new "Ziyaretler / Oturumlar" (Visits/Sessions) section, once Session V2 + visit-metadata capture exist:

| Column | Source | Notes |
|---|---|---|
| Timestamp | `session_visit_metadata.created_at_ms` | When the session was established |
| Guest/Account | `sestia_sessions.kind` | |
| Estimated location | `country_code`/`region`/`city`, rendered as "yaklaşık konum" | Blank/"bilinmiyor" (unknown) when not derived |
| Device | `device_class` | desktop/mobile/tablet/unknown |
| OS | `os` (+ optional major version) | |
| Browser | `browser` (+ optional major version) | |
| Entry/referrer | `entry_path`, `referrer_host` | Hostname only, never full URL |
| Meaningful activity | Reuses the prior audit's definition, joined by `subject_id` | Boolean or count |
| Last activity | From Session V2's own `last_activity_at_ms` | Not this report's concern to redefine |
| Session status | Active / warning / expired / logged out, from Session V2 | Read-only reflection of V2's own state machine |
| Internal/test | `is_internal_test` (session) or inherited from account default | Explicit, admin-editable |

**Aggregate summaries — using accurate terminology exactly as instructed:** "toplam oturum sayısı" (total sessions), "misafir kimliği sayısı" (guest identity count), "hesap sayısı" (account count), "anlamlı etkinliği olan oturum sayısı" (meaningfully active session count). **Never** "kullanıcı sayısı" (user count) or any phrasing implying a headcount of real people — this is the same discipline the prior activity-visibility audit already established and this report deliberately continues, now extended to sessions as well as identities.

---

## 11. Privacy/Data-Minimization Matrix

| Field | Classification | Why |
|---|---|---|
| Raw client IP | **DO NOT STORE** | Never needed once derived fields exist; a local geo lookup (Section 4, option B2) consumes the IP in-memory for one lookup and discards it — nothing about this design requires persisting it. |
| Full User-Agent string | **OPTIONAL, short retention** | The raw string is useful briefly for debugging a misclassification, but the *parsed* `{device_class, os, browser}` triple is what should be queried/displayed long-term; if kept at all, treat it as a debug-only field with a short retention window, not a primary observability field. |
| Precise coordinates (GPS/lat-long) | **DO NOT STORE** | Explicitly out of scope per the task; never requested, never derived, never asked of the browser. |
| Coarse country | **KEEP (if geo is ever enabled)** | Low re-identification risk at this granularity, genuinely useful for understanding worldwide reach. |
| Region/state/province | **OPTIONAL** | Marginal added value over country for a small testing pool; keep only if the chosen local geo dataset provides it for free (it usually does). |
| City | **OPTIONAL, always labeled estimated** | Real value for understanding local demo usage (e.g., confirming the mother's-iPhone demo matches an expected city), but the least accurate field (Section 4) and the one closest to feeling like surveillance if presented as certain — must always be shown as an estimate. |
| Timezone | **OPTIONAL** | Cheaply derivable from the same geo lookup if country/region are kept; low marginal cost, modest value (helps sanity-check "was this really a different visitor" against local time-of-day patterns). |
| Browser | **KEEP** | Coarse, low-entropy, directly useful for support/compatibility questions. |
| OS | **KEEP** | Same reasoning. |
| Device class | **KEEP** | Same reasoning; also directly useful for understanding mobile vs. desktop usage patterns for product decisions. |
| Referrer (hostname only) | **KEEP** | Low-sensitivity once reduced to hostname; useful for understanding how people found the link. |
| Referrer (full URL) | **DO NOT STORE** | Can carry another site's session tokens/query data not meant for this app. |
| UTM parameters (named keys only) | **KEEP** | Explicit, intentional marketing/campaign signal when present; low sensitivity. |
| Arbitrary/raw query string | **DO NOT STORE** | Could carry anything, including accidentally-pasted sensitive values; no product need to keep the raw string once named UTM keys are extracted. |
| Session establishment timestamp | **KEEP** | Core to the entire purpose of this feature; already effectively covered by Session V2's own `created_at_ms`. |

**Retention:** no field here has a natural expiry the way, say, an email verification code does. Recommend a simple, generous retention window (e.g. keep visit-metadata rows as long as their parent session row exists, consistent with this project's repeated, explicit instruction across all recent audits that expiry/timeout is never data deletion) rather than inventing a separate retention/cleanup job in this task — that remains the same explicitly-deferred future concern already named in the two prior audits (GST-07-style "retention is separate from timeout").

---

## 12. Recommended DB Fields

New table `session_visit_metadata` (name illustrative), one row per `session_id`, all columns except `session_id`/`created_at_ms` nullable and defaulting to an explicit "unknown" representation rather than being silently absent:

```
session_id            TEXT NOT NULL  -- FK to sestia_sessions(id), UNIQUE (one row per session)
created_at_ms         INTEGER NOT NULL
country_code          TEXT NULL      -- ISO 3166-1 alpha-2, NULL = not derived
region                TEXT NULL
city                  TEXT NULL
timezone              TEXT NULL
device_class          TEXT NULL      -- 'desktop' | 'mobile' | 'tablet' | 'unknown'
os                    TEXT NULL
os_version            TEXT NULL      -- major version only, if kept at all
browser               TEXT NULL
browser_version       TEXT NULL      -- major version only, if kept at all
entry_path            TEXT NULL
referrer_host         TEXT NULL      -- hostname only, never full URL
utm_source            TEXT NULL
utm_medium            TEXT NULL
utm_campaign          TEXT NULL
is_internal_test      INTEGER NULL   -- 0/1/NULL(unclassified), admin-set only
```

No raw IP, no full User-Agent (unless the OPTIONAL short-retention debug field from Section 11 is separately chosen), no full referrer URL, no raw query string, no GPS coordinates. Matches the "unknown must degrade gracefully" requirement directly: every field's absence is a normal, expected, explicitly-representable state, not an error.

---

## 13. Recommended Capture Point

**Server-side, at Session V2's session-establishment functions** (`lib/sessionStore.cjs`'s `guest()`/`account()`, or the future `/api/session/guest`/`/api/session/login-intent`→`account()` route handlers that call them) — **not** in `proxy.js`, and **not** on every request. This is a one-time-per-session write, co-located with the one-time-per-session identity-establishment write it naturally belongs beside, using the same transaction discipline Section 15 of the Session V2 audit already validated (`db.transaction(...).immediate()`). Device/browser classification reads the already-available `User-Agent` header from the same incoming request that triggers session establishment; geo (if ever enabled) performs one local, synchronous, in-process dataset lookup against the already-available client IP (Section 3) at that same moment — no separate network call, no separate request round-trip, no risk of blocking normal application traffic.

---

## 14. Recommended Geo Mechanism, If Needed

**Not needed for the current stage** (Section 4/18). If and when it becomes worth adding: a locally-bundled, dependency-only GeoIP dataset (`geoip-lite` or equivalent MaxMind GeoLite2-based package) queried synchronously and in-process at the capture point in Section 13. No external HTTP call per request, no raw IP persisted, no third party ever receives visitor IPs. The dependency and its periodic data-file refresh are the only ongoing cost.

---

## 15. Failure/Degradation Behavior

Every field in Section 12 is independently nullable and every consumer (the eventual admin view) must render "bilinmiyor"/"unknown" rather than blank or erroring when a field is `NULL`. Concretely, as instructed:

- A missing or unparseable `User-Agent` → `device_class='unknown'`, `os=NULL`, `browser=NULL` — never throws, never blocks session establishment.
- A geo lookup miss (private/reserved IP range, e.g. a health check or an internal Railway-to-Railway hop; an IP not present in the bundled dataset; or geo simply not enabled) → `country_code=NULL`/`region=NULL`/`city=NULL`, silently, immediately, with no retry and no delay.
- A missing `Referer` header (the normal case per Section 6) → `referrer_host=NULL`, not an error condition.
- **A failed or absent geo/device/referrer capture must never delay, retry, or block session establishment itself** — this write is purely observational and, if it fails for any reason, the correct behavior is to log the failure server-side (if at all) and proceed with session establishment exactly as if visit-metadata capture didn't exist. This mirrors the same fire-and-forget discipline already used by `lib/telemetry.js`'s existing `logEvent`/`reportError` (Section 6 of the prior activity-visibility audit: "must never bozmamalı ana akışı").

---

## 16. Exact Implementation Surfaces/Files (Not Implemented — For a Future Task)

- **New `lib/userAgentClass.cjs`**: small, dependency-free `{device_class, os, browser}` (+ optional major versions) classifier from a `User-Agent` string.
- **New `lib/visitMetadataStore.cjs`** (or a small addition inside `lib/sessionStore.cjs` itself, matching that file's existing self-bootstrapping-store convention): creates and writes the `session_visit_metadata` table, exposing one function (e.g. `recordVisit(sessionId, {headers, entryPath, query})`) called exactly once per new session establishment.
- **`lib/sessionStore.cjs`'s `guest()`/`account()`** (already built, KEEP-rated by the prior Session V2 review): add exactly one call to the new visit-recording function inside the same establishment transaction, or immediately after it (non-blocking either way per Section 15).
- **(Optional, deferred) `lib/geo.cjs`**: thin wrapper around a bundled GeoIP dataset, only if/when Section 14's recommendation is acted on. Not needed for the fields that don't depend on geo.
- **`app/admin/page.js`**: one new section reusing `RecordTable`, plus one new query function in `lib/db.js` (or wherever Session V2's own admin-facing reads live) joining `session_visit_metadata` with `sestia_sessions`.
- No change to `proxy.js` beyond whatever Session V2 already independently requires (Section 8 explicitly avoids adding new capture logic there).

---

## 17. Tests Required (Not Written — For a Future Task)

- Pure unit tests for `lib/userAgentClass.cjs`: a table-driven set of representative real-world `User-Agent` strings (major desktop browsers, iOS Safari, Android Chrome, a generic bot/unknown string) asserting the exact `{device_class, os, browser}` triple, plus an explicit "garbage/empty input → all `unknown`, never throws" case.
- Store-level tests for `session_visit_metadata` (same isolated-`:memory:`-DB + injected-clock pattern already used and proven for `tests/session-store.test.cjs`): one row per session, correct nullable-field defaults, no row written twice for the same session, and no coupling to session *activity* (writing/reading this table must never touch `last_activity_at_ms`/`idle_expires_at_ms` — an explicit regression test for the Section 11-of-this-report / Section 11-of-the-task separation requirement).
- A geo-lookup unit test (only if Section 14 is ever implemented): private/reserved IP ranges and a deliberately-unresolvable IP both degrade to `NULL`/"unknown," never throw, and never add latency beyond an in-process table lookup.
- An admin-page-level test verifying the new section never renders IP, full User-Agent, full referrer URL, or raw query string, consistent with Section 11's matrix, and never labels any count as a "user"/"person" count.

---

## 18. ONE Recommended Architecture

**Do not build a geo/device/referrer capture system today.** Instead:

1. **Now:** nothing to implement from this audit alone. Ship Session V2 (already separately approved and partially built) first, since it is the prerequisite that creates a clean, atomic "a new session began" moment to hang capture on.
2. **As part of the same Session V2 implementation effort (not before it, not as a separate later project):** add the small, additive `session_visit_metadata` table (Section 12), the hand-rolled UA classifier (Section 5), and the referrer/UTM capture (Section 6) — all wired into `lib/sessionStore.cjs`'s existing `guest()`/`account()` establishment calls (Section 13), all fire-and-forget with graceful "unknown" degradation (Section 15), and all deliberately **without** geo/IP-derived location for this first cut.
3. **Later, only if worldwide reach genuinely needs finer visibility than country-free device/browser/referrer data already gives** (i.e., if/when the testing pool grows well past today's scale): add local, in-process GeoIP (Section 14) as a strictly additive follow-up — the schema already has the columns waiting, `NULL` in the meantime.
4. **Throughout:** extend the existing `/admin` page only (Section 10); never a second admin surface, never a third-party analytics platform. No third-party service or new runtime dependency is required for steps 1–2; step 3, if ever taken, adds exactly one dependency (a bundled GeoIP dataset package) and nothing else.

This is the smallest system that satisfies the stated goal: useful, privacy-conscious, worldwide-generic session observability, correctly layered on top of (not duplicating, not racing, not redesigning) the already-approved Session V2 architecture.

---

## 19. Risks/Open Questions

- **Sequencing dependency on Session V2:** this report's entire recommendation assumes Session V2 gets implemented; until then, there is no clean way to capture "one row per visit" without either over-capturing (every request) or under-capturing (fragile heuristics). This is a real, acknowledged dependency, not a hidden one.
- **Product decision, not a technical blocker:** whether region/city/timezone are worth their small added complexity at all, given how coarse and VPN/CGNAT-degraded they inherently are (Section 4) — this audit's own recommendation is "not yet," but it's a judgment call, not a fact.
- **Product decision:** whether to keep the OPTIONAL short-retention full-User-Agent debug field (Section 11) at all — pure engineering convenience versus a slightly larger data footprint; either choice is defensible.
- **Open question needing your input, not an implementation detail:** should the account-level "known internal account" convenience flag (Section 9) exist at all, or is per-session marking alone sufficient? Both are safe; the account-level one is purely a time-saver for repeat marking of the same known dev/owner account.

---

## 20. Final Verdict

**CURRENT DATA IS INSUFFICIENT — INSTRUMENT FIRST** for the specific goal of this audit (worldwide visit/session observability: geo, device, browser, referrer). Unlike the prior activity-visibility audit — where every needed field already existed in already-written tables — **none** of the fields this task asks about exist anywhere today, historically or currently, for either identity type. New, small, additive capture is required, and the right sequencing is to build it as part of the already-approved Session V2 work (attached to session establishment), not as an isolated retrofit onto today's rolling-renewal guest model. No third-party analytics platform is required at any point in this recommendation.
