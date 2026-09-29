# SESTIA — Admin: Users / Activity / Analytics — Read-Only Audit

**Date:** 2026-09-29
**Status:** READ-ONLY AUDIT. No application code, schema, test, dependency, or configuration was changed. Nothing was migrated, deployed, pushed, or tracked. No database was opened or queried, local or staging. This report is the only file created.
**Basis:** the current working tree (HEAD `a2ae831`, branch `chore/gitignore-runtime-uploads`). Session V2 + visitor observability code was deployed to **staging** at `f175253` (see `SESTIA_SESSION_V2_STAGING_DEPLOY_REPORT.md`). The production Railway service is separate and was not checked. What it runs may differ from this report.

**Labels used below**

- **[CODE]**: read directly from source in this repository, with a file reference.
- **[REPORT]**: taken from an earlier report in `docs/reports/` and not re-verified against live data.
- **[INFERENCE]**: this audit's conclusion from the code, not observed in data.
- **[RECOMMENDATION]**: a proposal, not a fact.

---

## 0. Executive summary

1. **A 21:04 → 21:24 style activity timeline can already be built for accounts from existing tables, without new tracking.** Login comes from `sestia_sessions` (kind `account`). Room created comes from `rooms`, photo from `room_photos`, room scan from `room_analyses`, chat turn from `events.chat_message`, decision from `decisions`, last activity from `sestia_sessions.last_activity_at_ms`, and feedback from `feedback`. Every one of these rows has a timestamp and an owner key. **[CODE]**

2. **In SESTIA a "session" is already a "visit".** Session V2 ends a session after 5 minutes of no interaction for a guest and 10 minutes for an account (`lib/sessionPolicy.cjs`). An account cannot resume after that without a new email-code login. So for accounts in the Session V2 era, **account session count equals login count**, and each session is one bounded visit. The planned *User → Sessions → Visits → Events* model collapses to **Account → Sessions (= visits) → Product events**. **[CODE]**

3. **A guest is not a user.** Every guest session gets a **new random `subject_id`** (`lib/sessionStore.cjs:79`, `establish(f,'guest',randomUUID(),…)`), and guest data is never moved to an account. Two consequences follow:
   - Guest product rows map **exactly 1:1 to one session**, so per-guest-session activity is precise.
   - "Returning guest" and guest retention **do not exist by design**. A Users page is an **Accounts** page; guests appear only as sessions. **[CODE]**

4. **Guest → account conversion is derivable, in the same browser session only.** Both session kinds sit under a `sestia_session_families` row, which is the browser-scope cookie. When an account session is established in a family, the family's previous session is ended with `end_reason='replaced'`, or `'idle'` if it had already expired (`sessionStore.cjs:62-68`). So "a guest session followed by an account session in the same family" is a stored, queryable fact. Guest data does not carry over to the account. **[CODE]**

5. **Active time has a defensible first approximation today.** Session V2 renews a session only on trusted, deliberate interactions: `pointerdown`, `click`, `keydown`, `input`, `compositionend`, `change`. The client sends at most one report per 10 seconds. Mouse movement, scrolling, focus changes, tab visibility, timers and background requests never count. Two figures follow:
   - `last_activity_at_ms − created_at_ms` is an **interaction span**. Every internal gap is guaranteed to be shorter than the idle timeout.
   - `activity_revision` counts accepted interaction reports.

   Together they give a lower and upper bracket. Neither is "active time" in the strict sense; §3 gives the smallest fix. **[CODE]**

6. **The current Admin page mislabels three metrics.**
   - **"Aktif Cihaz (son 7 gün)"** counts only identities that **confirmed a decision** in the last 7 days. It reads `users.last_active_date`, which only `recordDecisions` writes.
   - **"Oturum"** in *Test Kullanıcıları* counts `session_start` client events. That event is a page mount that already had a live session, not a Session V2 session or a login.
   - **"Analiz"** counts `ai_suggestion_shown`. That event fires for single-item analyses, **again for every single-item chat follow-up**, and for room scans. It does not count room-scan chat turns. **[CODE]**

7. **The session list shows the account's lifetime totals on every session row.** The per-session product counts (Oda / Karar / Sohbet / Toparla / Geri bildirim) are counted by `subject_id`. That is exact for guests but not for accounts. **[CODE]**

8. **"How they arrived" is captured, but the values are mostly unusable.**
   - `referrer_host` is read from the `Referer` header of SESTIA's own `POST /api/session/guest` fetch, so it is usually **SESTIA's own hostname**.
   - UTM parameters are read from `window.location.search` at guest-entry time. By then the visitor has already been redirected `/hosgeldin` → `/giris` → `/` with `window.location.replace`, so the parameters are gone.
   - `entry_path` is almost always `/`. **[CODE]**

9. **A single-item analysis is not recorded on the server.** `/api/analyze` writes nothing. The only trace is the client-sent, best-effort `ai_suggestion_shown` event (see item 6). Onboarding completion and access-code success are **not recorded at all**. Onboarding flags live in `localStorage` only. **[CODE]**

10. **The Admin gate is weak for per-person activity data.** It is a single shared `ADMIN_ACCESS_CODE` that sets a 30-day `admin_ok` cookie. It is not tied to any identity and leaves no audit trail. It is acceptable for today's aggregate page. It should be bound to the owner account before per-person timelines are exposed. **[CODE] + [RECOMMENDATION]**

11. **No new analytics platform is warranted.** SQLite, query-time SQL, and the existing Server Component admin page are the right size for SESTIA's scale (roughly a dozen identities on staging per the last measured audit **[REPORT]**).

---

## 1. SESTIA's actual identity / session model

```
Browser (session cookie scope)      sestia_session_families   id = family UUID (no maxAge → browser-session cookie)
  └── Session (= visit)             sestia_sessions           kind guest|account, subject_id, created/last_activity/ended
        ├── Visit metadata (1:1)    session_visit_metadata    coarse geo, device/OS/browser, entry/referrer/UTM, internal_test
        └── Owner (subject_id)      = device_id in every product table
              guest:   NEW random UUID per session  → owner ≡ session
              account: auth_user.id, stable         → owner spans many sessions
                         └── Product rows: rooms, room_photos, room_analyses, decisions,
                             chat_attachments, toparla_results, feedback, errors, events, users
```

- **Product tables have no `session_id`.** They are keyed by `device_id`, which is the owner. For guests this is equivalent to a session key. For accounts, a row can only be attributed to a session **by time window**. That is unambiguous only when the account had no other live session on another device at the same time. **[CODE]**
- **Timestamps are mixed.** Session tables use epoch milliseconds (`*_at_ms`). Product tables use SQLite `datetime('now')`, which is UTC text at 1-second precision. Both are UTC. The Admin page renders them **as UTC without saying so**, while users are in Türkiye (UTC+3). **[CODE]**
- **Data from before Session V2** (legacy `guest_session` UUIDs and old account activity) exists in product tables and `events`. It has **no** session rows. Any per-session view must show these as "legacy / pre-V2". **[CODE]**

---

## 2. Question 1: What data is already stored?

Legend for *Admin*: **Yes** means rendered on `/admin`; **Count** means only a count is rendered; **No** means not rendered.

### 2.1 Session / identity tables

**`sestia_session_families`** (`lib/sessionStore.cjs:8-11`): the browser coordination scope.

| Field | Records | Written when | Guest/Account | Persistent | Admin |
|---|---|---|---|---|---|
| `id` | Browser-scope UUID, carried in the signed cookie `sestia_session_scope_v2` | `proxy.js` `ensureFamilyCookie` on any request after the access gate when the cookie is missing or invalid | Both (pre-identity) | Row: yes. Cookie: browser-session only (no `maxAge`) | No |
| `revision` | Monotonic transition counter | Each session establishment and logout | Both | Yes | No |
| `current_session_id` | Latest session in this browser scope | Establishment | Both | Yes | No |
| `created_at_ms`, `last_transition_at_ms` | When the scope was created and last changed | Bootstrap / transitions | Both | Yes | No |
| `login_intent_hash`, `_expires_at_ms`, `_revision` | A pending email-login attempt (15 min) | `POST /api/session/login-intent`; cleared on establishment or logout | Account flow | Overwritten | No |

**`sestia_sessions`** (`lib/sessionStore.cjs:12-24`): the authoritative session and the core of any Users/Sessions view.

| Field | Records | Written when | Guest/Account | Persistent | Admin |
|---|---|---|---|---|---|
| `id` | Session UUID | Establishment (`guest()` / `account()`) | Both | Yes, no deletion code | Yes (8-char prefix) |
| `family_id`, `family_revision` | Parent browser scope and position | Establishment | Both | Yes | No |
| `kind` | `guest` \| `account` | Establishment | Both | Yes | Yes |
| `subject_id` | Owner: a new random UUID for a guest, `auth_user.id` for an account | Establishment | Both | Yes | Yes (prefix, or email for accounts) |
| `policy_version`, `idle_timeout_ms`, `warning_after_ms` | Frozen policy snapshot (v2: guest 300 s / 180 s, account 600 s / 300 s) | Establishment | Both | Yes | No |
| `created_at_ms` | Session start. **For accounts this is the moment of a successful email-code login.** | Establishment | Both | Yes | Yes ("İlk görülme") |
| `last_activity_at_ms` | Time of the latest accepted trusted interaction | `POST /api/session/activity` → `sessions.activity()` (`sessionStore.cjs:91-96`), only if the event is newer | Both | Yes, overwritten | Yes ("Son etkinlik") |
| `idle_expires_at_ms` | `last_activity + idle_timeout` (a CHECK constraint enforces this) | Same | Both | Yes | Used for status |
| `activity_revision` | Count of accepted, forward-moving activity reports | Same | Both | Yes | No |
| `ended_at_ms`, `end_reason` | `logout` \| `replaced` \| `idle` \| `policy` | Logout, or when the next session in the family is established (`idle` if the old one had already expired, otherwise `replaced`). **Pure idle expiry leaves both NULL** until then. | Both | Yes | Yes (status: computed `active`/`expired`, or `end_reason`) |
| `creation_key_hash` | Idempotency hash | Establishment | Both | Yes | No |

**`session_visit_metadata`** (`lib/visitMetadataStore.cjs:12-32`): one row per session, written once, observational only.

| Field | Records | Written when | Guest/Account | Persistent | Admin |
|---|---|---|---|---|---|
| `captured_at_ms` | Capture time | Guest: `POST /api/session/guest`. Account: `lib/auth.js` `recordAccountVisit` in the verified-login `jwt` callback | Both | Yes | No |
| `country_code`, `country_name`, `region`, `city`, `timezone` | Coarse geo from local `geoip-lite`. **The raw IP is used in memory and not stored.** | Same | Both | Yes | Yes (city, region, country joined; timezone not shown) |
| `device_class`, `os`, `os_version`, `browser`, `browser_version` | Coarse UA classification, major version only (`lib/userAgentClass.cjs`) | Same | Both | Yes | Yes (class / OS / browser; versions not shown) |
| `entry_path` | `window.location.pathname` at guest-entry click | Guest only (NULL for accounts) | Guest | Yes | Yes ("Giriş / Kaynak") |
| `referrer_host` | Hostname of the `Referer` header **of the establishment request itself** (see §4.4) | Both | Both | Yes | Only when `entry_path` is NULL |
| `utm_source`, `utm_medium`, `utm_campaign` | Named UTM keys from the URL at guest-entry click | Guest only | Guest | Yes | No |
| `internal_test` | Manual admin flag | `POST /api/admin/session-internal-test` | Both | Yes | Yes (toggle + filter) |

**Auth.js tables** (`lib/db.js:100-128`, `lib/authSchema.js`):

| Table.field | Records | Written when | Persistent | Admin |
|---|---|---|---|---|
| `auth_user.id` | Stable account ID = `device_id` in all product tables | Created on first verified login | Yes | Indirectly |
| `auth_user.email`, `name` | Email; display name (from `pending_signup` at sign-up) | Creation; name set in `events.createUser` | Yes | Yes (**unmasked** in *Test Kullanıcıları*; masked `k***@domain` in sessions) |
| `auth_user.emailVerified` | **Time of the most recent verified email login.** It is overwritten on every login (`@auth/core/.../handle-login.js:67-71`). It is not a sign-up date. | Each successful email login | Overwritten | Yes ("Son giriş") |
| `auth_user` created-at | **Does not exist.** Sign-up time is not stored. | n/a | n/a | n/a |
| `auth_account` | Provider link (Resend) | First login | Yes | No |
| `auth_verificationToken` | Pending 6-digit codes, keyed by email | Code request; deleted on use | Until used/expired | No (sensitive; do not surface) |
| `pending_signup` | Name typed at sign-up, keyed by email, 24 h | `/api/account/precheck`; deleted on use | Ephemeral | No |

### 2.2 Product tables (all keyed by `device_id` = owner; guest or account)

| Table (source) | Relevant fields | Written when | Persistent | Admin |
|---|---|---|---|---|
| `users` (`db.js:38`) | `created_at`: **first `/api/state` call with a valid identity**, via `getOrCreateUser` from `getState`, `getHomeMessage` and `hasStartedRealWork`. In practice this is "first app load as this owner". `last_active_date`: **date of the last decision only**. `streak`, `points`, `total_decisions`: gamification counters. | App load; decisions | Yes | `created_at` = "İlk kullanım"; `total_decisions` = "Karar"; `last_active_date` drives "Aktif Cihaz" |
| `rooms` (`db.js:145`) | `id`, `name`, `created_at`, `updated_at` (touched on photo, scan, decision) | `POST /api/rooms` (idempotent via `creation_operations`) | Yes (no delete path) | Count |
| `room_photos` (`db.js:159`) | `room_id`, `mime_type`, `created_at`; bytes on disk | `POST /api/rooms/[id]/photos`; also after a single-item decision made inside a room (`persistPhotosToActiveRoom`) | Yes | **No** |
| `room_analyses` (`db.js:190` + `roomDecisionStore.cjs:6-11`) | One row per room scan (`session_key` UNIQUE): `created_at` (first save of analysis), `updated_at` (each chat turn or draft), `items_json` (AI items), `suggestions_json` (original model suggestion per item), `draft_items_json`, `messages_json` (**room-scan conversation content**), `photo_ids_json`, `final_items_json` (user's final choices incl. `manual` override flag), `confirmation_json`, `revision`, `closed`, `close_reason` (`unconfirmed` / `legacy_unknown`) | Room scan save / draft / confirm / close (`/api/rooms/[id]/scan`) | Yes | **No** |
| `room_scans`, `room_scan_heads` | Active, unconfirmed scan pointer; generation counter | Scan lifecycle; `room_scans` row deleted on confirm/close | Transient | No |
| `decisions` (`db.js:47`) | `category`, `recommendation` (`tut` / `sat` / `bagisla` / `at` / `geri_donustur`), `reasoning`, `source` (`tekli` / `oda`), `room` (free text), `room_id`, `created_at` | `/api/decide` (single item) and room confirm (`roomDecisionStore.confirm`) | Yes | Count; 7-day daily bar chart |
| `chat_attachments` | `mime_type`, `created_at`; bytes on disk | `POST /api/chat/attachments` | Yes | **No** |
| `toparla_results` | `source_kind`, `status` (`pending` / `completed` / `failed`), `model`, `quality`, `error_message`, `created_at`, `updated_at` | Toparla generation (account-only) | Yes | Count |
| `creation_operations` | Idempotency receipts (room/photo). **No timestamp.** | Creation | Yes | No |
| `feedback` (`db.js:66`) | `message` (free text), `screen`, `created_at` | `POST /api/feedback` | Yes | Yes, **with message text** |
| `errors` (`db.js:74`) | `message`, `stack`, `screen`, `created_at`; `device_id` may be NULL | Client only: `GlobalErrorReporter` and `app/error.js` → `/api/error`. **Server exceptions only go to `console.error`, i.e. Railway logs.** | Yes | Yes (message, not stack) |
| `message_state`, `inspiration_cache` | Home-message rotation, weekly inspiration cache | App use | Yes | No (no analytics value) |

### 2.3 The existing event log: `events`

`events(id, device_id, event_type, payload_json ≤2000 chars, created_at)`, with an index on `(device_id, event_type, created_at)` (`db.js:57-64`). Server-side allowlist (`db.js:591`): six types. **There is no `session_id` column.**

| `event_type` | Emitted by | What it actually means | Payload |
|---|---|---|---|
| `session_start` | Client, `app/page.js:218`, on `PageInner` mount | A page load or reload **while a session already existed**. For a brand-new visitor, or right after a timeout remount, there is no identity yet, so `/api/event` silently drops it. **It is not a login and not a Session V2 session.** | none |
| `screen_view` | Client, `app/page.js:229`, every `view` change | Navigation; the noisiest event (159 of 219 rows on staging at the last audit **[REPORT]**) | `{screen}` |
| `mode_selected` | Client, `app/page.js:1461` | Chose single item vs room scan | `{mode}` |
| `ai_suggestion_shown` | Client, `app/page.js:1118` (single analysis), **`:1153` (every single-item chat follow-up)**, `:1374` (room scan). Not logged for room-scan chat. | A mix of analyses and chat turns | `{category, recommendation}` or `{items:[…]}` |
| `decision_confirmed` | Client, `app/page.js:1188`, `:1446`; one event per item | Duplicates the `decisions` table, plus the one field `decisions` lacks: `changedFromSuggestion` | `{category, recommendation, changedFromSuggestion, source}` |
| `chat_message` | **Server**, `app/api/sestia-chat/route.js:96` | One free Sestia-chat turn; content not stored | `{turn}` = length of the message array sent |

Client events go through `lib/telemetry.js` (fire-and-forget, `keepalive`). The identity is resolved on the server, and events without an identity are dropped. Payloads are **client-controlled JSON**: they are allowlisted by type only, not by shape. Events are **not** session activity and never renew a session. The Session V2 architecture forbids that coupling (`SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md` §6, lines 149 and 573). **[CODE]**

---

## 3. Question 2: What can be derived without adding tracking?

### ALREADY STORED (read directly)

- Account email and name; latest login (`auth_user.emailVerified`, and `MAX(created_at_ms)` of account sessions).
- Every Session V2 session: kind, start, last accepted interaction, idle deadline, explicit end and reason.
- Per-session coarse geo, device class, OS, browser (major versions), timezone, and the manual internal/test flag.
- Rooms, room photos, chat photos, room scans (with confirmed, closed-unconfirmed and open states), decisions (recommendation, source, room), Toparla attempts and outcomes, feedback, client-side errors.
- Sestia free-chat turns (`chat_message`), mode choices, screen views.

### DERIVABLE FROM CURRENT DATA

| Metric | Derivation | Caveats |
|---|---|---|
| First login (account) | `MIN(created_at_ms)` of `sestia_sessions` where `kind='account' AND subject_id=:id` | Session V2 era only (staging since `f175253`) |
| First seen (any owner) | `users.created_at` (first `/api/state` with that identity) | Accurate for the post-identity app load. Pre-V2 legacy identities included. |
| Login count | `COUNT(*)` of account sessions per `subject_id` | Session V2 era only. Every account session begins with an email-code login. |
| Number of sessions | Accounts: count of sessions. Guests: always exactly 1 per guest owner. | Guests cannot be counted as "people" |
| Last active | `MAX(last_activity_at_ms)` per account; per session directly | Reflects the last deliberate interaction, not the last page view |
| Session end | `ended_at_ms` / `end_reason`, else `idle_expires_at_ms` if past | Idle expiry is computed, not stored, until the next establishment |
| Interaction span per session | `last_activity_at_ms − created_at_ms` | See §4: an approximation, not active time |
| Returning account | ≥ 2 account sessions on different days (or separated by > X hours) | Accounts only |
| Guest → account conversion | Same `family_id`: guest session at revision *n*, account session at a later revision; the guest row usually carries `end_reason='replaced'` | Same browser scope only. A person who closes the browser and signs up later is not linked, which is correct. **Guest data is not migrated.** |
| Reached app but never started | `sestia_session_families` rows with `revision=0` / no sessions | Weak: one family per browser session, so the same person can create several |
| Abandoned email login (current only) | Family with an expired `login_intent_expires_at_ms` and no later account session | Only the latest intent per family survives; weak signal |
| Device / browser / geography | `session_visit_metadata` join | Estimated; VPN/CGNAT distort city |
| Room count, photos, chat photos | `COUNT` per owner | Per session exact for guests; time-windowed for accounts |
| Room scans started / completed / confirmed / abandoned | `room_analyses` rows; `final_items_json IS NOT NULL` (confirmed); `closed=1 AND close_reason='unconfirmed'` (abandoned); open otherwise | `created_at` is the first successful save, not the click |
| Room-scan chat turns | Count of user entries in `room_analyses.messages_json` | **Count only; never display the content** |
| AI override rate (room) | `final_items_json[*].manual` vs `suggestions_json` | Legacy rows have `suggestions_json IS NULL` |
| AI override rate (single) | `decision_confirmed.changedFromSuggestion` event payload | Client-sent, best effort |
| Decisions by type / source / room | `GROUP BY recommendation, source` on `decisions` | — |
| Decision completion | Room: confirmed ÷ saved scans. Single: decisions ÷ `ai_suggestion_shown` (single-shaped payloads, first per flow) | The single-item denominator is noisy (chat follow-ups) |
| Chat usage (free chat) | `chat_message` count; "chat started" ≈ `turn` = 1 or a reset of `turn` | No conversation ID; a context switch looks like a new chat only when `turn` resets |
| Toparla usage / success rate | `toparla_results.status` | Account-only feature |
| Feedback / error per owner | `COUNT` | Server errors are not in the DB |
| DAU/WAU (Session V2 era) | Distinct accounts with a session active that day, plus guest sessions with ≥ 1 accepted interaction or product row that day | Report accounts and guest sessions **separately**, never as "users" |
| Activity timeline | `UNION ALL` of the timestamped rows above per owner (see §8.3) | Account rows are attributed to sessions by time window |

### NOT CURRENTLY AVAILABLE

- **Account sign-up time** as a distinct fact. `auth_user` has no creation column, and `events.createUser` does not persist anything except the name. It can be approximated by the first account session, V2 era only.
- **Onboarding completed**, name given vs skipped, intro skipped. These live in `localStorage` only (`sestia_guest_id_confirmed`, `sestia_intro_skipped`; `app/page.js:296-299`, `:1873-1874`). The server only knows a guest session was established, which implies the welcome screen was passed.
- **Access-code gate success or failure history.** The limiter is in memory only.
- **Single-item analysis on the server** (success, failure, latency, item category). `/api/analyze` persists nothing.
- **Room coverage check** (`mode=oda-kapsam`). Not recorded.
- **True active time** (see §4).
- **Reliable arrival source** (see §6.4). The captured referrer and UTM values are structurally broken.
- **Session attribution of product rows for an account on two devices at the same time.**
- **Returning guests, guest retention, guest headcount.** Impossible by design; intentional.
- **Server-side error history.** `console.error` only.
- **Logout reason for an account that closed the tab.** Indistinguishable from idle, which is correct.

---

## 4. Question 3: Active time

### 4.1 How `last_activity` works today

1. **Client** (`components/SessionLifecycleProvider.js:140-163`). Capture-phase listeners on `document` for exactly `pointerdown`, `click`, `keydown` (not auto-repeat), `input`, `compositionend`, `change`. Events must be trusted (`isTrusted !== false`) and inside `document.body` (`lib/sessionClient.cjs:15-22`). A report is sent **at most once per 10 s** (`REPORT_COALESCE_MS`) and only while the session is `active`. There is **no periodic heartbeat**.
2. **Server** (`app/api/session/activity/route.js` → `sessions.activity()`, `lib/sessionStore.cjs:91-96`):
   - Rejects cross-origin requests, unknown event names, future timestamps, and timestamps older than 15 s.
   - If `eventAt > last_activity_at_ms`, it sets `last_activity_at_ms = eventAt`, sets `idle_expires_at_ms = eventAt + idle_timeout_ms`, and increments `activity_revision`.
   - Nothing else writes these fields.
3. **Non-renewing traffic.** Status reads (`GET /api/session`, which fires on focus, visibility and `pageshow`), telemetry, errors, media, `/api/state`, and AI calls never move `last_activity_at_ms`. This is tested (`tests/session-store.test.cjs` "status/background reads never renew").
4. **Idle timeout.** Guest 5 min, account 10 min. After that the session is dead and a new one must be established. For an account, that means a new email-code login.

### 4.2 What is defensible today, without new tracking

Per session:

- **Interaction span** = `last_activity_at_ms − created_at_ms`.
  - It includes idle gaps. **Every gap is strictly shorter than the idle timeout** (< 5 min guest, < 10 min account), otherwise the session would have ended.
  - It **excludes** reading time after the last interaction, which can be up to the timeout.
  - It is **not inflated by background tabs**. A hidden tab cannot produce trusted clicks or keypresses, and visibility/focus changes validate but never renew.
- **Interaction reports** = `activity_revision`. With 10 s coalescing, `activity_revision × 10 s` roughly approximates time spent **interacting densely**. It undercounts reading, waiting for AI results, and looking at photos.
  - Caveat: two open tabs each coalesce independently, so reports can double in multi-tab use.
  - Caveat: a report is only counted when its timestamp moves forward.

**Verdict.** A bracket of `[≈ reports × 10 s, interaction span]` per session, summed per account, is a **defensible "engaged time" approximation** if it is labelled honestly. A suggested label is *"etkileşim süresi (yaklaşık)"*. It is **not** `logout − login`, and it does not claim exact attention.

Known distortions:

- AI waits (single-item and room analysis take seconds) count only when they sit between two interactions.
- A user who reads a long AI reply without clicking for 4 minutes and then leaves: none of those 4 minutes count in the span.
- A 9-minute coffee break between two clicks in an account session counts fully in the span.

### 4.3 What is needed to measure active time properly (proportionate options)

**Option A (recommended; smallest; no client change): capped-gap accumulation on the server.**
In `POST /api/session/activity`, after `sessions.activity()` succeeds, add the gap `min(eventAt − previous_last_activity, CAP)` to a per-session accumulator. With `CAP = 60 s`, a gap longer than 60 s contributes 60 s, which credits some reading time without crediting a coffee break.

- Store it in a **separate additive table**, e.g. `session_engagement(session_id PK, engaged_ms, reports, updated_at_ms)`, so the reviewed session-authority schema stays untouched. This is the same principle already used for `session_visit_metadata`.
- Write it in a `try/catch` after the authoritative update. It must never affect authorization, and nothing may read it for session decisions.
- It is not retroactive; history starts at deployment.

**Option B (only if reading time matters later): visible-and-focused presence ticks.**
While `document.visibilityState === 'visible'` **and** `document.hasFocus()`, send one lightweight tick every 30–60 s, only if there was a qualifying interaction within the last N minutes, so an unattended open window stops counting. Ticks go to a **separate analytics endpoint that never calls `sessions.activity()`**. They must not become a covert heartbeat that extends sessions; the architecture explicitly forbids that (§23 scenario 31: "no periodic activity heartbeat"). This adds client code and traffic. Do not build it before Option A has shown the approximation is insufficient.

**Do not:**

- Use `logout − login` or `idle_expires_at − created_at`.
- Count time since `created_at` for sessions that ended by idle; the last 5–10 minutes are by definition inactive.
- Use `mousemove`, `scroll`, `wheel` or `visibilitychange` as activity.
- Derive active time from `screen_view` event density.

---

## 5. Question 4: Product events

### 5.1 What exists

An event log **exists**: the `events` table, `logEvent`, and `POST /api/event`. It has three structural weaknesses:

1. **No `session_id`.** Account events cannot be attributed to a session except by time window.
2. **Mostly client-emitted.** Five of six types are client-side and best effort, and can be dropped when no identity is present yet. Payloads are client-controlled JSON.
3. **Wrong granularity.** Noisy `screen_view`; an ambiguous `ai_suggestion_shown`; `decision_confirmed` duplicates a table.

The strongest finding is that **most meaningful product events are already recorded as domain rows** with timestamps. A separate event for each would be duplication.

| Desired event | Already recorded as | Needs new instrumentation? |
|---|---|---|
| `login_success` | `sestia_sessions` row, `kind='account'` | **No** |
| `guest_session_started` | `sestia_sessions` row, `kind='guest'` | **No** |
| `guest_converted_to_account` | Same-family guest → account session transition | **No** (derivable) |
| `logout` | `end_reason='logout'` | **No** |
| `room_created` | `rooms.created_at` | **No** |
| `photo_uploaded` | `room_photos.created_at`, `chat_attachments.created_at` | **No** |
| `room_scan_completed` | `room_analyses.created_at` (+ confirm/close states) | **No** |
| `decision_selected` | `decisions.created_at` (+ recommendation/source) | **No** |
| `feedback_submitted` | `feedback.created_at` | **No** |
| `toparla_requested` / `completed` / `failed` | `toparla_results` | **No** |
| `message_sent` (free chat) | `events.chat_message` (server-side) | **Needs `session_id`** only |
| `chat_started` | `chat_message` with `turn = 1` | Derivable; a small `context_kind` prop would help |
| `item_analysis_completed` / `failed` | Only client `ai_suggestion_shown` (conflated) | **Yes, server-side** |
| `onboarding_completed` (+ name given / skipped) | Nothing server-side | **Yes** |
| `account_created` (first-ever sign-up) | Nothing | **Yes** (one line in `events.createUser`) |
| `room_coverage_checked` | Nothing | Optional |
| `error` (server) | Railway logs only | Optional (error **codes** only) |

### 5.2 Smallest clean architecture (not implemented)

- **Keep the `events` table.** Do not create a second event system.
- Add **one nullable column** `session_id TEXT` and an index `(session_id, created_at)`. This is additive; old rows stay NULL, which marks them as legacy.
- Add **one server-side helper**, e.g. `recordProductEvent({ ownerId, sessionId, type, props })` in `lib/db.js`:
  - A **per-type props allowlist**, e.g. `item_analysis_completed: { mode, itemCount, latencyMs, ok }`. Unknown keys are dropped.
  - No free text, no content, no model output, no filenames, no email.
  - Wrapped in `try/catch`; never throws into the product flow.
- **Emit on the server** at the route where the fact becomes true (`/api/analyze` success or failure, `events.createUser`, feedback, etc.). The server already has the session state from `getSessionState()`. A client-emitted event remains only for facts the server cannot see (`onboarding_completed` with a `nameGiven` boolean).
- **Derive rather than duplicate.** The timeline and analytics read `UNION ALL` over domain tables plus `events`. `decision_confirmed` and `session_start` can be retired from new-code reliance.
- **Never** feed any of this into `sessions.activity()`.

---

## 6. Question 5: The Admin panel today

### 6.1 Access and routes

| Route | Purpose | Gate |
|---|---|---|
| `/admin-giris` + `POST /api/admin-access` | Code entry; sets `admin_ok` (HMAC, 30 days), rate-limited (5 per client, 30 global) | Public |
| `/admin` (`app/admin/page.js`) | The only admin page: a Server Component calling `lib/db.js` functions directly. **No admin JSON API exists.** | `proxy.js` checks `admin_ok`. In private-owner mode (`PRIVATE_OWNER_EMAIL`) the proxy instead requires the owner's active account session, and `admin_ok` is not checked. |
| `POST /api/admin/session-internal-test` | Toggle `internal_test` for a session | `admin_ok`; **no same-origin check** (open review item MEDIUM-3) |

There are **no tests** for the admin query functions (`getTesterAccounts`, `getSessionObservability`, `getActiveDeviceCount`). There is no pagination; the sessions table is capped at 100.

### 6.2 What is visible and whether it is correct

| Section | Shows | Correctness |
|---|---|---|
| **Aktif Cihaz (son 7 gün)** | `COUNT(users WHERE last_active_date ≥ now−7d)` | **Mislabelled.** `last_active_date` only changes on a confirmed decision. This is "identities that decided something in 7 days", not active devices. |
| **Test Kullanıcıları** (accounts only) | email (unmasked), name, "İlk kullanım" (`users.created_at`), "Son giriş" (`emailVerified`), "Son etkinlik" (`MAX(events.created_at)`), "Oturum" (**`session_start` count**), "Analiz" (**`ai_suggestion_shown` count**), "Sohbet mesajı" (`chat_message`), "Karar" (`users.total_decisions`), "Oda", "Geri bildirim" | "Oturum" and "Analiz" are **wrong proxies** (§0.6). "Son etkinlik" reflects the last *telemetry* row, not `last_activity_at_ms`. No Session V2 data is used. |
| **Oturumlar / Ziyaretler** | Per session: start, kind, email (masked) or subject prefix, session prefix, estimated location, device/OS/browser, "Giriş / Kaynak", last activity, status, Oda/Karar/Sohbet/Toparla/Geri bildirim, internal toggle; filters all/guest/account/external/internal | Good foundation. **Product counts are per owner, not per session**: exact for guests, lifetime totals repeated on every row for accounts. "Giriş / Kaynak" shows `entry_path`, which is almost always `/`. |
| **Günlük Karar Sayısı** | Decisions per day, 7 days | Correct (UTC days) |
| **Geri Bildirimler** | Last 50: time, who, screen, **full message** | Correct |
| **Hatalar** | Last 50 client errors: time, who, screen, message | Correct; client-side errors only |

All times are UTC and unlabelled. The internal/test filter only applies to the sessions table, not to the other sections.

### 6.3 What can be surfaced immediately from existing data (no schema change)

- An **Accounts** list: first seen, first and latest login (V2), login count, last active, summed interaction span, most recent device/browser/country, and counts of rooms, room photos, room scans (confirmed and abandoned), decisions by type, chat turns, chat photos, Toparla, feedback.
- A **per-account detail page**: session list with per-session span and reports, and a derived **activity timeline** (§8.3).
- **Per-guest-session detail**: exact, because owner ≡ session.
- **Correct overview metrics**: sessions per day by kind; accounts active per day or week; guest sessions with a meaningful action; conversions; decisions by recommendation and source; room-scan funnel; AI override rate (room); Toparla success rate.
- Correct relabelling of the three mislabelled metrics, UTC labelling or Europe/Istanbul rendering, and applying the internal/test flag to aggregates.

### 6.4 What needs backend or schema additions

| Need | Addition |
|---|---|
| Session-attributed events for accounts | `events.session_id` (nullable column) |
| Server-side single-item analysis, onboarding, account-created events | `recordProductEvent` + allowlisted types (§5.2) |
| Better active time | `session_engagement` side table (§4.3 A) |
| Working arrival source | Capture `document.referrer` (hostname) and the named UTM keys **on the first landing page** (`/hosgeldin`, which today uses `location.replace`), keep them in `sessionStorage`, and pass them to guest establishment and to login intent for accounts. Today's `referrer_host` is the establishment fetch's own `Referer`, i.e. SESTIA's own host, and the redirect chain drops the UTM query. |
| Server error history (codes only) | Optional `recordError` on the server in route `catch` blocks |
| Stronger admin gate | Bind `/admin` to the owner account (existing `privateAccess` / Auth.js + an active Session V2 session), or at least add an admin-access audit log and a shorter cookie |

---

## 7. Question 6: Privacy and security

### 7.1 Implications of exposing per-person activity to Admin

- **The gate becomes the main control.** Today a shared static code gives 30 days of access, with no identity, no log and no second factor. A leaked code would expose a timeline of what named testers did and when, plus estimated city and device. **[RECOMMENDATION]** Before shipping per-account timelines, require the owner account with an active Session V2 session (the proxy already implements this pattern for private-owner mode). Log admin page views (time and session only) and add the same-origin check to the admin POST route.
- **Small-population re-identification.** With a handful of testers, *estimated city + device + time of day* identifies a person even without an email. Show location as **"yaklaşık konum"**. Show the **latest or most common** location per account, **not a location history**. Keep city off aggregate exports.
- **Content stays out of Admin.** `room_analyses.messages_json` and `items_json` (user-typed text and AI replies), photos, chat attachments, Toparla images, and error stacks must appear only as **counts or statuses** in activity views. Feedback text is the one intended exception: the user wrote it to the owner.
- **Emails.** Show them in the account detail, where the owner needs them for support. Masking in list views keeps the page shareable on screen. The current page is inconsistent: unmasked in one table, masked in the other.
- **Pseudonymous identifiers.** Use 8-character prefixes of session and subject UUIDs (already the convention). Never render the signed cookie values.
- **Guests stay sessions.** Do **not** stitch guest sessions into a "person" through `family_id`, timing, geo or device. `family_id` is a first-party, browser-session-scoped cookie. It may be shown as "same browser scope" for the conversion metric, but must not be turned into a guest profile. The earlier audits deliberately avoided exactly this, and nothing here changes that.
- **Transparency.** The app collects coarse geo, device and product-activity metadata, but **no user-facing privacy notice exists** (no `gizlilik` / `KVKK` text in `app/` or `components/`). **[RECOMMENDATION]** Add a short notice on the welcome or sign-up screen before expanding admin visibility or opening beyond invited testers. Check obligations under applicable data-protection law (e.g. KVKK/GDPR); this report is not legal advice.
- **Retention.** No retention or deletion path exists for sessions, visit metadata, events, orphaned guest data, or accounts (the only deletes in `lib/` are transient scan pointers and `pending_signup`). The Session V2 architecture flagged this as deferred (line 589). **[RECOMMENDATION]** Define it before or alongside Phase 2, e.g. keep visit metadata for N months and then keep only aggregates, and support deleting an account's data on request.

### 7.2 Do NOT collect

- Raw IP address (the current code correctly discards it after the lookup; keep it that way). Full User-Agent string. Full referrer URL. Raw query strings.
- GPS or precise location. Browser geolocation prompts.
- Keystrokes, typed text in events, mouse movement, scroll depth, hover, rage-click heatmaps, session replay or screen recording.
- Chat, analysis or feedback content inside `events` payloads.
- Device fingerprinting signals: canvas/WebGL, fonts, screen resolution, fine-grained versions.
- Third-party analytics SDKs or pixels sending visitor data off-server.
- A periodic heartbeat that renews sessions, or any reuse of analytics as session authority.
- Unused verification-token rows as an "abandoned sign-up" metric. They are keyed by email and security-sensitive.

---

## 8. Question 7: Proposed Admin information architecture (adapted to SESTIA)

### 8.1 Structure

```
/admin
├── Genel Bakış (Overview)        counts by kind (accounts vs guest sessions — never "users"),
│                                 sessions/day, active accounts 7d/30d, guest sessions with a meaningful
│                                 action, conversions, decisions by type, room-scan funnel, Toparla
│                                 success, internal/test excluded by default (toggle)
├── Hesaplar (Accounts)           one row per auth_user
│   └── /admin/hesaplar/[id]      Hesap · Oturumlar · Etkinlik akışı · Odalar/Taramalar/Kararlar · Geri bildirim
├── Oturumlar (Sessions)          the existing table, fixed: per-session counts for guests,
│   └── /admin/oturumlar/[id]     time-windowed counts for accounts, UTC→TR time, arrival fields
│                                 session detail + timeline (guest sessions are exact)
├── Etkinlik (Activity feed)      recent meaningful events across everyone (types + counts, no content)
├── Analitik (Analytics)          Phase 3 — weekly trends, funnel, retention (accounts only)
├── Geri Bildirim                 existing
└── Hatalar / Sistem              existing client errors (+ server error codes in Phase 2)
```

Why this differs from the generic *Users → Sessions → Visits* template:

- In SESTIA, **Session = Visit**, so there is no separate Visits level.
- **Only accounts are users.** Guests are one-session identities, so they live under *Sessions*. That is honest about what the data can show.
- Keep it as **Server Components under the existing gate** (sub-routes of `/admin`). No client-side analytics app and no admin JSON API are needed.

### 8.2 Account detail fields (all existing data)

Account: masked or full email, name, first seen (`users.created_at`), first login (V2), latest login, login count, last active, summed interaction span (labelled approximate), internal flag. Sessions: start, end or reason, span, reports, device, browser, estimated location. Work: rooms (name, created, photo count), room scans (created, status, item count, override count), decisions (time, recommendation, source, room), Toparla (time, status), chat turns (count per session), feedback (time, screen, text).

### 8.3 Activity timeline (derivable today)

A single read-only `UNION ALL` per owner, ordered by time. Each source is shown with the content kept out.

| Timeline item | Source | Time field |
|---|---|---|
| Giriş (login) / Misafir oturumu | `sestia_sessions` | `created_at_ms` |
| Oda oluşturuldu | `rooms` | `created_at` |
| Fotoğraf yüklendi | `room_photos`, `chat_attachments` | `created_at` |
| Oda taraması tamamlandı | `room_analyses` | `created_at` (+ status) |
| Sohbet mesajı | `events` `chat_message` | `created_at` |
| Tek eşya analizi (approx.) | `events` `ai_suggestion_shown` (single-shaped) | `created_at` |
| Karar: Tut/Sat/Bağışla/Geri Dönüştür/At | `decisions` | `created_at` |
| Toparla | `toparla_results` | `created_at` / `updated_at` |
| Geri bildirim | `feedback` | `created_at` |
| Son etkileşim | `sestia_sessions` | `last_activity_at_ms` |
| Çıkış / zaman aşımı | `sestia_sessions` | `ended_at_ms` / `idle_expires_at_ms` |

Normalize both timestamp formats to epoch ms in SQL, e.g. `CAST((julianday(created_at) - 2440587.5) * 86400000 AS INTEGER)`, and render in Europe/Istanbul.

---

## 9. Capability matrix

| Capability | Current status | Existing source/table | Already stored? | Derivable? | Requires new tracking? | Admin currently shows it? | Recommendation |
|---|---|---|---|---|---|---|---|
| Account identity (email, name) | Stored | `auth_user` | Yes | — | No | Yes (unmasked, testers table) | Keep; account detail page; mask in lists |
| Account sign-up time | Missing | — (`users.created_at` ≈ first load) | No | Approx. (first load / first V2 session) | Small: `account_created` in `events.createUser` | Partly ("İlk kullanım") | Phase 2 one-line event; label current value "ilk görülme" |
| First login | Derivable | `sestia_sessions` (account) | Indirect | Yes (V2 era) | No | No | Phase 1 |
| Latest login | Stored | `auth_user.emailVerified`; `sestia_sessions` | Yes | Yes | No | Yes ("Son giriş", UTC) | Phase 1: use V2 session; label TR time |
| Login / session count | Derivable | `sestia_sessions` | Indirect | Yes | No | **Wrong** ("Oturum" = `session_start` mounts) | Phase 1: replace |
| Guest session started | Stored | `sestia_sessions` (guest) | Yes | — | No | Yes (sessions table) | Keep |
| Last active | Stored | `sestia_sessions.last_activity_at_ms` | Yes | MAX per account | No | Per session yes; testers table uses telemetry MAX | Phase 1: use session field |
| Session end & reason | Stored + computed | `ended_at_ms`, `end_reason`, `idle_expires_at_ms` | Yes | Yes | No | Yes (status) | Keep |
| Active time | Approximate only | `created_at_ms`, `last_activity_at_ms`, `activity_revision` | Partly | Bracket | Yes, for accuracy (capped-gap accumulator) | No | Phase 1 show span (approx.); Phase 2 `session_engagement` |
| Returning account | Derivable | `sestia_sessions` | Indirect | Yes | No | No | Phase 1/3 |
| Returning guest / guest retention | Impossible by design | — | No | No | Would need tracking; **do not** | No | Do not build |
| Guest → account conversion | Derivable (same browser scope) | `sestia_sessions` + `family_id` | Indirect | Yes | No | No | Phase 1 overview metric |
| Device / OS / browser | Stored | `session_visit_metadata` | Yes | — | No | Yes | Keep |
| Coarse geography | Stored | `session_visit_metadata` | Yes | — | No | Yes (per session) | Keep; label estimated; no location history |
| Timezone | Stored | `session_visit_metadata.timezone` | Yes | — | No | No | Optional display |
| Arrival: referrer / UTM / entry | Stored but mostly unusable | `session_visit_metadata` | Yes (low quality) | No | Yes: capture at first landing | Yes ("Giriş / Kaynak" ≈ "/") | Phase 2 fix capture point |
| Access-code gate passed | Missing | — | No | No | Optional | No | Skip (low value) |
| Reached app, never started | Derivable (weak) | `sestia_session_families` | Indirect | Yes (weak) | No | No | Phase 3 funnel top, labelled weak |
| Onboarding completed / name skipped | Missing (localStorage only) | — | No | Guest establishment implies it | Yes (client event, boolean props) | No | Phase 2 |
| Mode selected | Stored | `events.mode_selected` | Yes | — | No | No | Phase 3 funnel |
| Room created | Stored | `rooms` | Yes | — | No | Count | Timeline + detail |
| Photo uploaded | Stored | `room_photos`, `chat_attachments` | Yes | — | No | No | Phase 1 counts + timeline |
| Single-item analysis | Client event only, conflated | `events.ai_suggestion_shown` | Partly | Approx. | Yes (server-side event) | Wrong proxy ("Analiz") | Phase 2 `item_analysis_completed/failed` |
| Room scan completed / confirmed / abandoned | Stored | `room_analyses` | Yes | — | No | No | Phase 1 |
| Room coverage check | Missing | — | No | No | Optional | No | Optional Phase 2 |
| Decision selected (5 types) | Stored | `decisions` | Yes | Breakdown | No | Count + daily chart | Phase 1 breakdown |
| AI suggestion overridden | Partly | `room_analyses` (room); `decision_confirmed` payload (single) | Partly | Yes | No | No | Phase 3 metric |
| Chat started | Derivable | `events.chat_message` (`turn`) | Indirect | Approx. | Small (`context_kind`) | No | Phase 2 prop |
| Messages sent | Stored (free chat); room chat in JSON | `events.chat_message`; `room_analyses.messages_json` | Yes | Count | `session_id` on events | Yes (free chat only) | Phase 1 counts (never content); Phase 2 `session_id` |
| Toparla usage / success | Stored | `toparla_results` | Yes | Rate | No | Count | Keep; add status split |
| Feedback submitted | Stored | `feedback` | Yes | — | No | Yes (text) | Keep; link to account |
| Client errors | Stored | `errors` | Yes | — | No | Yes | Keep |
| Server errors | Logs only | Railway logs | No | No | Optional (codes only) | No | Optional Phase 2 |
| Screen views | Stored (noisy) | `events.screen_view` | Yes | — | No | No | Do not surface as a primary metric |
| Per-account activity timeline | Derivable | UNION of the above | Indirect | Yes | No | No | **Phase 1 centerpiece** |
| Per-session product counts (accounts) | Derivable by time window | product tables + `sestia_sessions` | Indirect | Approx. | `session_id` for exactness | Wrong (lifetime totals per row) | Phase 1 fix; Phase 2 exact |
| DAU / WAU | Derivable (V2 era) | `sestia_sessions` | Indirect | Yes | No | **Wrong** ("Aktif Cihaz") | Phase 1 fix; Phase 3 trend |
| Average active session time | Approximate | `sestia_sessions` | Partly | Median span | Yes for accuracy | No | Phase 3 on engagement data |
| Retention cohorts | Derivable (accounts) | `sestia_sessions` | Indirect | Yes | No | No | Phase 3 |
| Funnel / drop-off | Partly derivable | families → sessions → rooms → photos → scans → decisions | Indirect | Yes (no onboarding steps) | Onboarding event | No | Phase 3 |
| Guest vs account behaviour | Derivable | all product tables × `kind` | Indirect | Yes | No | Filter only | Phase 3 |
| Internal / test classification | Stored | `session_visit_metadata.internal_test` | Yes | — | No | Yes (sessions only) | Apply to all aggregates |

---

## 10. Phased implementation plan (proportional to SESTIA today)

### Phase 1: surface what already exists

No schema change, no new tracking, no new dependency.

1. **Fix the three mislabelled metrics**, which are wrong today:
   - "Aktif Cihaz" becomes *active accounts / guest sessions (7 days)* from `sestia_sessions`.
   - "Oturum" becomes the V2 login count.
   - "Analiz" is split into room scans (`room_analyses`) and *approximate* single-item analyses.
2. **Add an Accounts list** (one read-only query in `lib/db.js`) with the fields in §8.2.
3. **Add an account detail page** under `/admin` (Server Component, same gate) with its sessions and the derived **activity timeline** (§8.3). Show content as counts and statuses only.
4. **Fix the Sessions table**: exact counts for guest sessions, time-windowed counts for account sessions (labelled), UTC → Europe/Istanbul rendering, and the internal/test filter applied to every aggregate.
5. **Overview**: accounts vs guest sessions (never "users"), conversions, decision breakdown, room-scan funnel, Toparla success.
6. **Tests**: in-memory-DB tests for the new query functions, following the existing `tests/visit-metadata-store.test.cjs` pattern. Include one test asserting that no content columns (`messages_json`, `items_json`, `message` except in feedback, stack) are selected by activity queries.
7. **Tighten the admin gate before per-person timelines go live.** Require the owner account session, log admin views, and add a same-origin check on the toggle route. This is small and uses existing primitives.

### Phase 2: add the missing meaningful events

Additive only.

1. `events.session_id` (nullable) plus the server-side `recordProductEvent` helper with per-type props allowlists (§5.2).
2. Server-side events:
   - `item_analysis_completed` / `item_analysis_failed` (mode, item count, latency)
   - `account_created` (in `events.createUser`)
   - `onboarding_completed` (client; `nameGiven` boolean only)
   - `chat_message` gains `session_id` and `context_kind`
   - optionally `room_coverage_checked` and server error **codes**
3. `session_engagement` side table with capped-gap accumulation in `/api/session/activity` (§4.3 A). No client change.
4. Fix arrival capture: referrer hostname and named UTM keys taken at the first landing page and carried to establishment (§6.4).
5. A written retention policy, and deletion support for an account's data (§7.1).
6. Stop relying on `session_start` and `decision_confirmed` in new code. Keep emitting them for now, or retire them later.

### Phase 3: aggregate product analytics

Query time, in SQLite, on the same admin surface.

- Weekly: active accounts, guest sessions with a meaningful action, returning accounts, median engaged time per session (from Phase 2 data), conversions.
- Funnel: reached app → session → room → photo → analysis → decision confirmed. Single-item and room paths separately. Onboarding step once Phase 2 exists.
- Feature usage: single-item vs room scans, chat, Toparla; the AI override rate by recommendation.
- Retention: weekly account cohorts. **Guests are excluded by design.**
- Charts: extend the existing inline `DailyBarChart` style. **No third-party analytics platform.** Add a daily rollup table only if a query ever becomes measurably slow, which is unlikely at this scale.

---

## 11. Smallest recommended next step

**Phase 1, items 1 + 2 + 6**:

- One new read-only query function, `getAccountActivitySummary()`, over `auth_user`, `sestia_sessions`, `users` and the product tables.
- Replace the three mislabelled metrics on the existing `/admin` page with correct ones.
- Add tests for both.

No schema change, no tracking, no new route. It corrects numbers that are currently misleading and gives real first/latest login, login count, last active, and approximate engaged span per account. The account detail page with the timeline (item 3), together with the admin-gate hardening (item 7), is the natural follow-up.

---

## 12. Side observations (not in scope; for awareness)

- `SessionLifecycleProvider.js:149` calls `shouldSendActivityReport` **without `idleExpiresAt`**, so the documented "flush immediately within 15 s of the deadline" branch (`lib/sessionClient.cjs:33`) never runs. It is harmless for analytics. A single click just before the deadline still renews when it falls outside the 10 s coalescing window.
- `referrer_host` for guest sessions is the Referer of a same-origin `fetch`, so it records SESTIA's own host (§6.4). For accounts it is the Referer of the Auth.js callback navigation, which is also the app's own origin.
- `getTesterAccounts` orders by `emailVerified` and shows `users.created_at`. Both are SQLite UTC text and render without a timezone label.
- Earlier reports describe `users.created_at` as set only on a decision (`SESTIA_TEST_USER_ACTIVITY_VISIBILITY_AUDIT.md` §4). The current code creates the `users` row on the **first `/api/state` call** (`getOrCreateUser` via `getState`), so it is a first-app-load timestamp.

## 13. Limits of this audit

- No database was queried. Statements about data volumes come from earlier reports and may be outdated.
- Production's deployed code was not inspected. Everything here describes this repository, as deployed to staging at `f175253`.
- Timing claims about coalescing and timeouts come from code, not from measurement in a browser.
