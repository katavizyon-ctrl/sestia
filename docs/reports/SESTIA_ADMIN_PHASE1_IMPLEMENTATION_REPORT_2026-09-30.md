# SESTIA — Admin Phase 1 (Accounts / Sessions / Activity) — Implementation Report

**Basis:** `docs/reports/SESTIA_ADMIN_USER_ACTIVITY_AND_ANALYTICS_AUDIT_2026-09-29.md` (Phase 1).
**Status:** Implemented and tested. Committed locally on its own branch `feat/admin-accounts-activity-phase1`, together with the audit it implements. Not pushed, merged or deployed. Railway was not touched and no environment variable was changed anywhere.
**Scope held:** no new tracking, no event types, no `events.session_id`, no engagement table, no heartbeat, no schema migration, no change to Session V2 semantics or idle timing, no change to Auth.js login behaviour. Every new query is read-only.

---

## 1. What was built

| Route | Content | Access |
|---|---|---|
| `/admin` | Overview (Genel Bakış). Last 7 days: active accounts, account logins, guest sessions, guest sessions with meaningful activity, guest → account conversions. All time: product totals (rooms, photos, room scans by status, decisions by all five types, chat turns, Toparla, feedback, the single-item analysis proxy labelled approximate). Daily decisions by Istanbul day. Feedback and client errors. | Owner, or legacy code |
| `/admin/hesaplar` | Accounts list: one row per `auth_user`, masked email | Owner, or legacy code (detail links only for the owner) |
| `/admin/hesaplar/[id]` | Account detail: full email; summary; product summary; **derived activity timeline**; sessions with time-window counts; feedback text | **Owner only** |
| `/admin/oturumlar` | Sessions / visits: exact counts for guest rows, time-window counts for account rows, internal/test toggle | Owner, or legacy code |

Every page has the same internal/test filter (`İç/Test hariç` by default, `dahil`, `sadece`). All times are rendered in Europe/Istanbul.

## 2. Files

**New**

- `lib/adminActivity.cjs`: read-only queries, time-window attribution, timeline (factory with an injected DB).
- `lib/adminTime.cjs`: UTC → Europe/Istanbul formatting, Istanbul day keys, durations, email masking.
- `lib/adminAccess.cjs`: owner-email helpers, pure so `proxy.js` can use them.
- `lib/adminGuard.js`: server re-check for pages and routes, plus the `admin_view` log line.
- `lib/adminData.js`: wires the app's single DB connection into the admin queries.
- `app/admin/layout.js`, `app/admin/AdminSessionKeeper.js`, `app/admin/_ui.js`.
- `app/admin/hesaplar/page.js`, `app/admin/hesaplar/[id]/page.js`, `app/admin/oturumlar/page.js`.
- `app/admin-giris/AdminCodeForm.js`.
- `tests/admin-activity.test.cjs` (22 tests).

**Modified**

- `app/admin/page.js`: rewritten as the overview.
- `app/admin-giris/page.js`: server page; in owner mode it explains owner login and shows no code form.
- `app/api/admin-access/route.js`: refuses the shared code in owner mode.
- `app/api/admin/session-internal-test/route.js`: same-origin check, server re-check, session-ID shape validation, return target confined to `/admin`.
- `proxy.js`:
  - `/admin/*` sub-routes are now gated. Before, only `/admin` itself was; sub-routes would otherwise have fallen through to the ordinary app access code.
  - Owner-mode session check added.
- `lib/db.js`: removed the six old admin helpers (`getActiveDeviceCount`, `getDailyUsage`, `getTesterAccounts`, `getRecentFeedback`, `getSessionObservability`, `getRecentErrors`). Their metrics were semantically wrong, and removing them stops them from being reused. Nothing else used them. The schema bootstrap is untouched.
- `tests/guest-onboarding-e2e.test.cjs`: sets `ADMIN_OWNER_EMAIL` in its isolated environment and adds one admin-gate check.

## 3. The three corrected metrics

| Old label | Old source | Replaced by |
|---|---|---|
| Aktif Cihaz | `users.last_active_date` (written only by confirmed decisions) | **Active accounts** (account sessions with `last_activity_at_ms` in the last 7 days) and, shown separately, **guest sessions with meaningful activity** |
| Oturum | `events.session_start` (page mounts) | **Login count** = number of `sestia_sessions` rows with `kind='account'` per `subject_id` |
| Analiz | `events.ai_suggestion_shown` (analyses, single-item chat turns and room scans mixed together) | **Room scans** from `room_analyses` (confirmed / closed / open), plus a separate **single-item analysis (approximate)** figure labelled as a legacy proxy that also counts chat turns |

Each correction has a regression test.

## 4. Interpretation rules implemented

- **Accounts vs guests.** Only `auth_user` rows are accounts. Guests appear only as sessions. No guest session is ever linked to another; the guest → account conversion figure links exactly one guest session to the account session that directly follows it in the same browser scope.
- **Attribution.** Account product rows have no `session_id`, so each row is assigned to the account session whose window contains its timestamp:
  - The window is `[created_at − 1 s, min(ended_at, idle_expires_at)]`. The 1 s allows for SQLite's second-precision timestamps.
  - A row inside two sessions is **ambiguous**. It is never counted exactly for either; the session row shows `(+n?)`, and the timeline lists both session IDs.
  - A row inside no session is **outside** (mostly pre-Session-V2 data).
  - Guest rows are exact, because a guest owner is exactly one session.
- **Interaction span** = `last_activity_at_ms − created_at_ms`, summed per account. It is labelled *"Yaklaşık etkileşim aralığı"* with an explicit note that it is not attention time. The activity-report count (`activity_revision`) is shown next to it.
- **Session end.** A stored `end_reason` is shown as-is. An idle expiry that has not been stamped yet is shown as *"Zaman aşımı (hesaplanan)"*.
- **Internal/test.** The flag stays per session (unchanged mechanism).
  - A guest owner is internal when its session is flagged.
  - An account counts as internal only when **all** of its Session V2 sessions are flagged; a mixed account stays included.
  - Pre-V2 owners cannot be flagged. The overview says how many such legacy guest identities are included.
- **Meaningful guest activity** = at least one room, room photo, chat photo, room scan, single-item analysis event, decision, chat turn, Toparla request or feedback.

## 5. Privacy

- **Columns never selected:**
  - `items_json`, `messages_json`, `suggestions_json`, `draft_items_json`, `photo_ids_json`
  - decision `reasoning`, file names, Toparla `error_message`
  - error `stack`
  - event payloads, credential hashes

  `final_items_json` and `confirmation_json` appear only in `IS NULL` / `IS NOT NULL` checks, to derive room-scan status. The unit test enforces this at the SQL-statement level and also scans every output for sentinel strings.
- **Email** is masked in the accounts list, the sessions list and the feedback/error lists. The full email appears only on the owner-only detail page. The E2E test asserts that the list HTML contains no full email.
- **Location** is always labelled approximate. The latest location is shown per account; no location history exists anywhere.
- **Feedback text** appears in the feedback lists and on the detail page, as intended. The timeline shows only "Geri bildirim gönderildi (screen)".

## 6. Admin access

- **Owner mode** is on when `ADMIN_OWNER_EMAIL` is set, or when `PRIVATE_OWNER_EMAIL` lockdown is on.
  - `/admin`, `/admin/*` and `/api/admin*` require that verified account **and** an active Session V2 account session: the same binding the existing private-owner path uses. This is checked in `proxy.js` and again on the server in every page and route.
  - The shared `ADMIN_ACCESS_CODE` is refused outright (`403 owner_account_required`), so it cannot weaken this path.
  - Inside the panel, `AdminSessionKeeper` mounts the existing `SessionLifecycleProvider`. Genuine clicks and keys in the panel renew the owner's session through the same endpoint the app uses, with no new traffic type, and expiry sends the owner back to `/admin-giris`.
- **Code mode** is the default when neither variable is set. The legacy shared code keeps working for the overview, the accounts list and the sessions list only. **Account detail and timelines are not rendered** in code mode.
- **Admin-view auditing.** One server log line per page view: `admin_view {"path","mode","session"}`, using an 8-character session prefix and never an email. A persistent admin-audit table is **Phase 2**.

**To enable the owner path on staging (not done):** set `ADMIN_OWNER_EMAIL` to the owner's address on the staging service. The owner then signs in through the app with the email code and opens `/admin`.

## 7. Verification

- `npm test`: **278/278 pass**.
  - This includes the 22 new admin tests.
  - The E2E file's 22 checks include the new owner-gate check:
    - sub-routes are gated for a guest holding `access_ok`;
    - the shared code gets 403;
    - a non-owner account is refused;
    - the owner opens all pages; the list shows masked emails only; the detail shows the full email and the timeline;
    - an unknown ID gets 404;
    - a cross-origin toggle gets 403, a same-origin toggle gets 303 with a hostile `returnTo` confined to `/admin`, and the flag is written;
    - an idle-expired owner session is refused.
- **One earlier full run** reported the E2E file as failed. It then passed when run alone and in two later full runs. The failure output was not captured, so the cause is unknown; it may be a flake under parallel load.
- `npm run build`: succeeds, and all four admin routes are registered.
- **Browser check** on an isolated server: temporary database, test-only secrets, synthetic seed data, deleted afterwards.
  - Owner login through the real UI and Auth.js callback.
  - Overview, accounts, account detail with a 04:02 → 04:32 timeline including an ambiguous two-device decision, and the sessions page with a real toggle click.
  - The admin panel's own activity report (`POST /api/session/activity` → 200).
  - No new console or server errors. The only server error was the expected Resend "invalid API key" from the fake key.

## 8. Known limits and Phase 2 candidates

- Session attribution for accounts is time-window based by design; exact attribution needs `events.session_id` and per-row session IDs (Phase 2).
- The interaction span is an approximation; a real engagement measure is Phase 2 (capped-gap accumulator).
- Internal/test marking is per session. An account-level "known internal account" default remains the open question from the visitor-observability audit; Phase 1 does not auto-classify.
- The admin audit trail is a log line, not a table.
- The accounts list computes everything in memory from full-table reads. This is fine at current scale; revisit if rows reach the tens of thousands.
