# SESTIA — Test User / Guest Activity Visibility Audit

**Status:** READ-ONLY AUDIT. No application code, test, schema, or configuration was modified. Nothing was committed, deployed, pushed, or changed on Railway/environment variables. No AI/email provider was called. The staging database was queried **read-only** (`better-sqlite3` opened with `{ readonly: true }`) via `railway ssh`; no row was inserted, updated, or deleted anywhere. No photo, chat, analysis, or feedback **content** is reproduced anywhere in this report — only counts, timestamps, and masked/truncated identifiers.

---

## 1. Current Relevant Schema

Read in full from `lib/db.js` and the self-bootstrapping store modules (`lib/chatAttachmentStore.cjs`, `lib/toparlaStore.cjs`, `lib/creationStore.cjs`, `lib/roomDecisionStore.cjs`):

| Table | Key columns | Owner column |
|---|---|---|
| `users` | `device_id` (PK), `streak`, `last_active_date`, `points`, `total_decisions`, `created_at` | `device_id` |
| `decisions` | `id`, `device_id`, `category`, `room`, `room_id`, `created_at` | `device_id` |
| `events` | `id`, `device_id`, `event_type`, `payload_json`, `created_at` | `device_id` |
| `feedback` | `id`, `device_id`, `message`, `screen`, `created_at` | `device_id` |
| `errors` | `id`, `device_id`, `message`, `stack`, `screen`, `created_at` | `device_id` |
| `rooms` | `id`, `device_id`, `name`, `created_at`, `updated_at` | `device_id` |
| `room_photos` | `id`, `room_id`, `device_id`, `created_at` | `device_id` |
| `room_analyses` | `id`, `room_id`, `device_id`, `session_key`, `created_at`, `updated_at` | `device_id` |
| `chat_attachments` | `id`, `device_id`, `created_at` | `device_id` |
| `toparla_results` | `id`, `device_id`, `source_kind`, `status`, `created_at`, `updated_at` | `device_id` |
| `auth_user` | `id`, `email`, `name`, `emailVerified` (timestamp, set on first/each verified login) | `id` |
| `pending_signup` | `email` (PK), ephemeral, deleted on use | n/a |
| `creation_operations` | `owner`, `kind`, `operation_key` — idempotency receipts only, **no timestamp column** | `owner` |

`device_id` is the universal ownership key everywhere except `auth_user`/`auth_account`/`auth_verificationToken` (Auth.js's own tables, keyed by `id`/`email`). For an account, `device_id` *is* `auth_user.id` (confirmed via `lib/identity.js`: `getIdentity()` returns `{id: session.user.id, type:'account'}`, and every store call downstream uses that `id` as `device_id`). This means **account and guest activity live in exactly the same tables**, distinguished only by whether `device_id` exists as a row in `auth_user`.

---

## 2. Current Guest Identity Model

Confirmed from `lib/guestToken.js`/`proxy.js` (current HEAD `a68405f`): a signed, HttpOnly `guest_session` cookie carrying a `crypto.randomUUID()`, currently on a 1-hour rolling-inactivity window (the timeout shipped earlier in this engagement; **Session V2, which would shorten this to 5 minutes and add a server-authoritative session record, is designed but not yet implemented** — see Section 11). The guest's `subject_id`/`device_id` is this UUID. **No table stores "guest identity created" as its own event** — a guest's *existence* is only inferable retroactively, the first time it does something that writes a row (a Tek Eşya decision → `users`, a room → `rooms`, any telemetry event → `events`, etc.). A guest who only ever loads the page and never acts leaves **zero trace** in the database.

---

## 3. Current Account Identity Model

Standard Auth.js JWT-strategy flow (`lib/auth.js`, verified in the prior Session V2 review against the actual installed `@auth/core` source): `auth_user.emailVerified` is set/updated on **every** successful verified login (not just the first), so it functions as a rough "last verified sign-in" timestamp, not a strict first-seen. There is **no `created_at` column on `auth_user` at all** — first-seen for an account can only be inferred indirectly, from the earliest row that account's `device_id` (`=auth_user.id`) produced in `users`/`events`/`rooms`/etc. `pending_signup` holds a typed onboarding name only until email verification consumes it — not a durable record.

---

## 4. What Is Recorded Today

| Data point | Status | Detail |
|---|---|---|
| Unique guest identities | **RELIABLY RECORDED** (as a byproduct) | Any `device_id` not present in `auth_user` that appears in any table is a distinct guest identity. No dedicated "guest created" log. |
| Account identities | **RELIABLY RECORDED** | `auth_user` row per account, `email`/`name`/`emailVerified`. |
| Guest UUID / ownerId / device_id | **RELIABLY RECORDED** | Same value everywhere by design (single ownership key). |
| `auth_user` records | **RELIABLY RECORDED** | Full row available. |
| First known appearance (account) | **PARTIALLY INFERABLE** | No `created_at` on `auth_user`; must derive from earliest linked-table row. `emailVerified` is not first-seen (updates every login). |
| First known appearance (guest) | **PARTIALLY INFERABLE** | `users.created_at` exists but only if a Tek Eşya decision was made; otherwise derive from earliest `events`/`rooms`/`decisions`/`chat_attachments` row. A guest who never wrote anything has no first-seen at all. |
| Last known activity | **PARTIALLY INFERABLE** | No single "last active" column covers all actions; `users.last_active_date` is a **date** (not timestamp) updated only by Tek Eşya decisions; must take `MAX()` across `events`/`rooms.updated_at`/`decisions.created_at` for a fuller picture. |
| Access-code success | **NOT RECORDED** | `app/api/access/route.js` verified in full: on success it only sets the `access_ok` cookie; no DB write of any kind. Attempt limiting (`lib/attemptLimiter.cjs`) is in-memory and resets on process restart — not historically queryable even for failures. |
| Onboarding progress (name/hitap chosen vs. skipped) | **CLIENT-ONLY / NOT AVAILABLE SERVER-SIDE** | `sestia_guest_id_confirmed`/`sestia_intro_skipped` live in `localStorage` only (`app/page.js`); the server never learns which onboarding path a guest took. |
| Guest name/hitap | **CLIENT-ONLY / NOT AVAILABLE SERVER-SIDE** | Confirmed via `lib/client.js`: `getUserName`/`setUserName` are pure `localStorage` reads/writes, guest-id-scoped client-side only. The server has no column for a guest's chosen name anywhere. (Account names *are* server-side, in `auth_user.name`.) |
| Rooms created | **RELIABLY RECORDED** | `rooms` table, `device_id` + `created_at`. |
| Room photos uploaded | **RELIABLY RECORDED** | `room_photos`, `device_id` + `created_at` (count only — not file identity in this report). |
| Item photos/uploads (Tek Eşya) | **PARTIALLY INFERABLE** | Tek Eşya's photo itself is not stored as a row (analyzed in memory, per existing architecture); only the resulting `decisions` row is durable. A Tek Eşya *attempt* that never reached a decision leaves no trace. |
| Analyses performed | **RELIABLY RECORDED** (rooms) / **PARTIALLY INFERABLE** (Tek Eşya) | `room_analyses` is durable per room-scan session. Tek Eşya analyses are only visible via the `ai_suggestion_shown` telemetry event, which is best-effort, non-authoritative telemetry, not a system-of-record table. |
| Decisions made | **RELIABLY RECORDED** | `decisions` table, both Tek Eşya and room-sourced. |
| Conversation usage | **PARTIALLY INFERABLE** | No conversation/message table exists (confirmed: chat text is never persisted, per existing test `no chat text is ever written to the database`). Only a `chat_message` **telemetry event** per turn (`app/api/sestia-chat/route.js:96`) gives a turn count — content is genuinely gone, by design, not just hidden from this report. |
| Chat attachments | **RELIABLY RECORDED** | `chat_attachments`, `device_id` + `created_at` (count/existence only; bytes not inspected by this audit). |
| Toparla usage | **RELIABLY RECORDED** | `toparla_results`, `device_id`, `status`, `source_kind`, `created_at`. |
| Feedback | **RELIABLY RECORDED** (existence/count) | `feedback` table records message existence, screen, timestamp; this report does not print message text (privacy rule). |
| Telemetry/events | **RELIABLY RECORDED**, but **narrow** | Exactly six allowed event types (Section 6) — everything else silently drops server-side even if a client tried to send it. |
| Any other meaningful action | **NOT RECORDED** | No event exists today for: room creation, room photo upload, chat-attachment upload, or any Toparla lifecycle stage. These are only visible via their own dedicated tables (which is actually fine — see Section 9 — but they will never show up if you only look at `events`). |

---

## 5. What Is NOT Recorded Today

Consolidating the "NOT RECORDED" / "CLIENT-ONLY" rows above: access-code success/failure history, which onboarding path a guest took, a guest's chosen display name, a true bounded "session" (start+end) for either identity type, and any authoritative last-activity timestamp that isn't reconstructed by scanning multiple tables. None of this is a defect for the product to function — it simply means today's data cannot answer certain questions precisely (see Section 8's honest limitations).

---

## 6. Current Telemetry/Event Behavior

Exhaustively enumerated by reading every `logEvent(...)` call site plus the server-side allowlist (`lib/db.js:589`, `const ALLOWED_EVENT_TYPES = ['screen_view','mode_selected','ai_suggestion_shown','decision_confirmed','session_start','chat_message']`):

| Event | Fires when | Identity attached | Timestamp | Useful for "did they really use it"? | Noisy? |
|---|---|---|---|---|---|
| `session_start` | Once per page mount (`app/page.js` initial `useEffect`) | Yes, server-resolved | Yes | Weak signal alone (a mount is not usage) but useful as an "opened the app N times" count | Low-noise, but not itself meaningful activity |
| `screen_view` | Every `view` state change | Yes | Yes | Weak — reflects navigation, not accomplishment | **Yes, by far the noisiest** (159 of 219 total staging event rows, see Section 8) |
| `mode_selected` | User explicitly picks Tek Eşya vs. Oda Taraması | Yes | Yes | Good — a real, deliberate choice | Low |
| `ai_suggestion_shown` | An analysis result is returned (Tek Eşya ×2 call sites, room scan ×1) | Yes | Yes | Good — proves an analysis actually completed | Low |
| `decision_confirmed` | A decision is saved (Tek Eşya or per-item room decision) | Yes | Yes | Good, but **redundant** with the `decisions` table itself, which is already the authoritative record | Low, but duplicative |
| `chat_message` | Server-side, once per chat turn (`app/api/sestia-chat/route.js`) | Yes | Yes | Good — proves a real conversation turn happened | Low |

**Analytics vs. session-renewal separation (explicitly checked, as requested):** `logEvent`'s only caller path is the client's `fetch('/api/event', ...)` (or the server-internal call from `sestia-chat`). This is a plain, non-renewing write to the `events` table — it has **no connection whatsoever** to the current guest-cookie renewal mechanism in `proxy.js`, nor to the not-yet-built Session V2 activity endpoint (`POST /api/session/activity`, per the authoritative architecture). The two systems are already structurally separate today, and the Session V2 spec independently reinforces this by design (its own activity classifier explicitly excludes "telemetry/error dispatch" from counting as renewing activity). **No risk of analytics accidentally becoming session-renewal activity was found**, and the recommendation in this report introduces no new coupling between them.

---

## 7. Current Available Identity/Activity Records — Staging Was Actually Queried

**Staging (not merely local) data was accessed, read-only, via `railway ssh -p b795a2ac-f8ca-4d5f-9a0b-496e6d5d7b1b -e staging -s sestia-test`**, opening `/app/data/app.db` with `better-sqlite3({ readonly: true })`. No write occurred (the `readonly` flag makes this structurally impossible, not just a promise). This is the real database the ~4 shared testers and the owner's own devices actually hit — not this local environment's own `data/app.db` (which only reflects this development session's own dev-server usage and is not representative of real testers).

**Aggregate counts (staging, as of this audit):**

- **Accounts (`auth_user` rows): 1**
- **Distinct guest `device_id`s with any footprint at all: 12**
- **Total distinct application identities with any evidence: 13**
- Event rows: `screen_view` 159, `session_start` 34, `chat_message` 21, `decision_confirmed` 20, `ai_suggestion_shown` 5 (219 total)
- `feedback` rows: 1. `errors` rows: 0.

---

## 8. Distinct Guest/Account Counts — What Is and Isn't Reliably Derivable

**Identity created vs. meaningful activity, applied to the real staging data:**

Using the Section 9 definition (a device_id counts as "meaningfully active" if it has ≥1 room, room photo, decision, room analysis, chat attachment, Toparla result, or feedback row — a mere `session_start`/`screen_view` does not count):

- **2 of the 12 guest identities are identity-only** — they exist (2 `session_start` events each) but produced zero product output of any kind.
- **10 of the 12 guest identities performed at least one meaningful action.**
- **The 1 account is meaningfully active** (2 rooms, 7 room photos, 1 room analysis, 1 feedback submission, across sessions spanning 2026-09-25 22:54 to 2026-09-26 15:11).
- **Total meaningfully-active application identities: 11** (10 guests + 1 account).

**This is the honest limit of what the data can tell you, stated explicitly as instructed:**

- **13 distinct identities is very likely an overcount of real distinct humans.** You told us the link has gone to ~4 people, plus the owner's own extensive personal testing, plus at least one demo on the owner's mother's iPhone — a realistic real-world headcount in the single-digit range (roughly 4–7 people). 13 identities is well above that. There is **no signal in the current data** — no IP, no device fingerprint, nothing correlating two guest UUIDs to the same physical person — that can tell you which of the 12 guest IDs are the same person returning (via a cleared cookie, a private/incognito window, a different browser, or simply the guest-timeout architecture minting a fresh identity), versus genuinely distinct external testers. **This is not a bug or a gap to fill with more instrumentation — it is the correct, intentional consequence of never fingerprinting guests, which you've explicitly asked to preserve.**
- One circumstantial (not certain) observation, offered because it's directly relevant to your question and independently verifiable rather than a guess about identity: two identities — one guest (created 2026-09-25 22:41 UTC) and the one account (first evidence 2026-09-25 22:54 UTC) — both appear within the same 13-minute window on the earliest day of activity, consistent with (not proof of) early developer/owner testing rather than an external tester. This is offered as a timing pattern only; **no claim is made about whose identity this is.**
- One guest identity (masked id `c227…`) shows a completed Toparla result despite Toparla being account-gated today. This is fully explained by chronology, not a security gap: comparing the row's UTC timestamp (2026-09-26 21:21) against this repository's own commit history, Toparla V1 (`1bb3946`) had just been committed roughly 7 minutes earlier and the account-only gate (`9d49424`) was not committed until about 2.5 hours later — i.e., this row dates from the brief window when Toparla existed but was not yet account-gated, almost certainly from this engagement's own feature-verification testing, not a live security bypass. No current guest can produce this today (confirmed: both Toparla routes reject a guest identity with 403 before any claim).
- **Number of guests who "merely established an identity": 2.** **Number who performed meaningful work: 10.** **Number of accounts that actually used the product: 1 of 1.** These specific counts *are* reliable, in the narrow sense that they accurately describe what the 12+1 rows in the database show — what is **not** reliable is treating "12" or "13" as a headcount of real people.

---

## 9. Meaningful-Activity Definition (Recommended)

Checked against the actual product and code, not assumed from the task's example list:

| Candidate signal | Keep? | Why |
|---|---|---|
| Completed guest/account entry | **Drop as a distinct signal** | Not recorded today at all (Section 4/5) and not worth adding an event for — "any activity below" already implies entry happened. |
| Reached Keşif/Home | **Drop** | This is exactly what `screen_view` already (over-)captures; adding a dedicated event would duplicate existing noisy telemetry. |
| Uploaded a Tek Eşya photo | **Keep, but only as "reached a decision"** | The photo itself isn't stored; the only durable trace is the resulting `decisions` row. Recommend not inventing a new upload-attempt event for this stage — see Section 17. |
| Created a room | **Keep** | Durable (`rooms`), cheap, meaningful. |
| Uploaded a room photo | **Keep** | Durable (`room_photos`). |
| Requested analysis | **Keep (rooms already durable via `room_analyses`; Tek Eşya only via `ai_suggestion_shown` event)** | Good signal, already available. |
| Made a decision | **Keep** | Durable (`decisions`), the strongest signal of real product value delivered. |
| Sent a Sestia conversation message | **Keep** | Already recorded (`chat_message` event); good signal. |
| Attached a conversation image | **Keep** | Durable (`chat_attachments`). |
| Requested Toparla | **Keep** | Durable (`toparla_results`, any status). |
| Completed Toparla | **Keep, as a status filter on the same table** | No new table needed — `status='completed'`. |
| Submitted feedback | **Keep** | Durable (`feedback`), and arguably the single highest-signal action available. |

**Recommended minimal vocabulary for "meaningful product activity" at this stage:** an identity is meaningfully active if it has **≥1 row in any of**: `rooms`, `room_photos`, `decisions`, `room_analyses`, `chat_attachments`, `toparla_results`, `feedback`. This uses **only tables that already exist** — no new event type is required to compute it (see Section 18 verdict).

---

## 10. Privacy Considerations

Applied throughout this report and recommended for the visibility layer:

- **Never displayed, anywhere in this report or the proposed view:** photo bytes/contents, chat message text, analysis text/items, feedback message text, error stack traces/messages.
- **Displayed only:** masked email (`k***@gmail.com` style — first character of the local part, domain intact), truncated internal id (first 8 hex characters — already an existing convention in `app/admin/page.js`'s feedback/error tables), timestamps, and aggregate counts.
- **Guest re-identification risk:** explicitly out of scope and not attempted anywhere in this audit or its recommendation — no IP address, user agent, or device signal is read, stored, or proposed to be read/stored. This matches your explicit instruction and is achievable without any of that, because ownership is already keyed by an unguessable UUID.
- **Existing admin page's current email handling** (`app/admin/page.js`'s "Test Kullanıcıları" table) already shows **unmasked** email today, behind the separate `admin_ok` gate. This audit does not recommend changing that existing table (it's a deliberate, already-shipped owner tool where seeing the real email is useful for support/outreach) — the new, additive section proposed in Section 13/14 uses masked email, consistent with the privacy rule you set for *this* task, without touching what's already there.

---

## 11. Session V2 Compatibility

Checked against `docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md` and the Claude pre-implementation review, **without modifying either**. Three concepts, kept distinct as instructed:

- **Owner/application identity** (`device_id` today; `subject_id` under Session V2) — the durable thing that owns rooms/photos/decisions/etc. This is what the activity view should count and group by, **today and after V2**.
- **Session** (does not exist as a table today; under V2, a row in `sestia_sessions` with its own `id`, `created_at_ms`, `ended_at_ms`, `end_reason`). Today's `session_start` **event** is only a loose proxy for this — a page-mount counter, not a bounded, authoritative session record.
- **Meaningful activity** — orthogonal to both; a count of real product actions, unaffected by how identity/session is implemented underneath.

**Forward-looking consequence worth stating plainly:** under Session V2, a guest who goes idle for 5+ minutes mid-visit receives a **new** `subject_id` per the locked design — meaning **"distinct guest count" will become an even less reliable proxy for "distinct real testers" after V2 ships, not more.** The activity view proposed below should keep counting by owner/`subject_id` (correct and consistent before and after V2) but should **not** be read as a headcount tool at any point — that limitation is architectural, not a flaw to fix later. Once V2 ships, `sestia_sessions` will additionally provide a genuine bounded start/end per lifecycle (a real "session count" per owner, and for accounts specifically, multiple sessions correctly folding under one durable `subject_id`) — this is strictly additive future data, not something to block on now.

---

## 12. Options for Ongoing Visibility

**A. Local/read-only CLI report** (`npm run activity-report`): fast to build, zero deployment surface, but requires the product owner to have a working local dev environment and run a terminal command — a poor fit for a non-engineering owner checking in casually. Also cannot be run against staging without SSH access already set up locally (as this audit needed).

**B. Protected internal admin/activity page:** **an admin page already exists and is already deployed** — `app/admin/page.js`, gated by a separate `admin_ok` access-code cookie (`proxy.js`), already rendering exactly this style of table (`getTesterAccounts`, `getRecentFeedback`, `getRecentErrors`, `getActiveDeviceCount`, `getDailyUsage`). It is **account-only today** — it has no concept of guests at all. Extending it to add one more section covering **both** identity types is the smallest possible change: no new page, no new route, no new gate, no new auth mechanism — just one new query function plus one more reused `<RecordTable>` block in a file that already renders four of them.

**C. External analytics platform:** explicitly not recommended at this stage. With ~4 testers and 13 total identities in the entire dataset, a platform integration would be strictly more infrastructure, more third-party data exposure, and more ongoing maintenance than the problem warrants — and the task itself asks to avoid this absent a strong reason, which does not exist here.

---

## 13. ONE Recommended Current-Stage Solution

**Extend the existing `/admin` page (Option B) with one new, additive "Uygulama Kimlikleri" (Application Identities) section covering both guests and accounts.** Do not build a CLI tool, do not add a new page/route, do not add an external platform. This is the smallest change that gives the product owner a URL she can revisit any time, using an access mechanism (`admin_ok`) that already exists, already works, and she already has to reach the rest of the admin page.

---

## 14. Exact Proposed Fields

One row per distinct `device_id` (guest or account), sorted by most-recent activity:

| Field | Source | Notes |
|---|---|---|
| Type | `guest` / `account` | Derived: is `device_id` present in `auth_user`? |
| Short ID | first 8 chars of `device_id` | Matches existing admin-page convention |
| Masked email (accounts only) | `auth_user.email`, masked | `null`/blank for guests — never guessed |
| First evidence | `MIN()` across `users.created_at`, `rooms.created_at`, `decisions.created_at`, `events.created_at`, `chat_attachments.created_at` for that `device_id` | Explicitly labeled "first evidence," not "first seen" or "signup date," to avoid overclaiming precision (Section 4) |
| Last evidence | `MAX()` across the same tables plus `rooms.updated_at` and `users.last_active_date` | Same honesty framing |
| Rooms | `COUNT(*) FROM rooms` | |
| Room photos | `COUNT(*) FROM room_photos` | |
| Decisions | `COUNT(*) FROM decisions` | |
| Analyses | `COUNT(*) FROM room_analyses` | Tek Eşya analyses are only visible via the `ai_suggestion_shown` event count, shown separately |
| Chat messages | `COUNT(*) FROM events WHERE event_type='chat_message'` | |
| Chat attachments | `COUNT(*) FROM chat_attachments` | |
| Toparla (requested / completed) | `COUNT(*)` / `COUNT(*) WHERE status='completed' FROM toparla_results` | |
| Feedback | `COUNT(*) FROM feedback` | Count only, never the message text |
| Meaningful activity? | Boolean, per Section 9's definition | Lets the owner filter identity-only rows out at a glance |

No photo, message, analysis, or feedback **content** field is included anywhere in this design.

---

## 15. Exact Proposed Implementation Surface/Files

Not implemented in this task (read-only per instructions); this is the exact, smallest surface for a future implementation step:

- **`lib/db.js`**: one new exported function, e.g. `getIdentityActivitySummary()`, built as a small set of `UNION`/`LEFT JOIN` queries over existing tables only (mirrors the read-only query already written and run for this audit, minus the console-only masking which would move into the query/render layer). **No schema change, no migration, no new table.**
- **`app/admin/page.js`**: one new section, reusing the existing `RecordTable` component verbatim, calling the new function. Masking (`k***@domain`) applied at render time, not stored.
- Nothing else. No new route, no new cookie, no new dependency, no client-side code.

---

## 16. Whether Historical/Current Data Can Populate It Retroactively

**Yes, entirely.** Every field in Section 14 is computable from tables that already exist and already contain the full history back to this app's earliest use (confirmed by actually running the equivalent queries against staging in Section 7/8 — this is not a theoretical claim). The moment this section is added to `/admin`, it will show complete, accurate historical data for every identity that has ever done anything, with no backfill job needed.

---

## 17. Gaps That Only Future Events/Work Can Solve

- **A true bounded "session" (start + end, with a reason) per identity** — does not exist today for either identity type and cannot be reconstructed retroactively; only Session V2's `sestia_sessions` table will provide this going forward (Section 11).
- **Which onboarding path a guest took, and their chosen name server-side** — client-only today (Section 4); would require a deliberate, new, minimal server write at the moment of onboarding choice if this ever becomes worth knowing (not recommended now — low value relative to the privacy/complexity cost of adding a new server-side field for something currently working fine client-side).
- **Access-code success/attempt history** — not recorded and not recoverable retroactively; would require a new (small) write in `app/api/access/route.js` if ever wanted. Not recommended now: with ~4 testers on a single shared code, this has low value and the task explicitly asks to avoid infrastructure the current stage doesn't need.
- **Distinguishing the product owner's own testing from a genuine external tester** — **no event, past or future, can solve this without fingerprinting or self-reporting**, which you've correctly ruled out. The only realistic mitigation, if this ever matters more than it does now, is a manual, human one: the owner could ask each of the ~4 testers to submit at least one feedback message (already the highest-signal, already-existing action) so that "a distinct guest identity that also left feedback" becomes a much stronger (though still not certain) proxy for "a distinct real external tester." This is a process suggestion, not a code change.

---

## 18. Final Verdict

**CURRENT DATA IS SUFFICIENT — BUILD VISIBILITY LAYER**

Every field needed for a useful, privacy-safe, identity-type-aware activity view already exists in tables that are already written today, with no gaps that block building it. The one recommended change — extending the existing, already-deployed `/admin` page with one additive section and one new read-only query function — requires no new telemetry, no schema change, and no new infrastructure, and would have shown, immediately and correctly, every number reported in Section 7/8 of this audit had it existed already.
