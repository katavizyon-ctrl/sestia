# SESTIA — Guest Session 1-Hour Inactivity Timeout — Read-Only Audit

**Status:** READ-ONLY AUDIT. No application code, database, or configuration was modified while producing this report. Nothing was committed, deployed, pushed, or changed on Railway. No live AI provider calls were made.

**Scope:** Design a 1-hour rolling *inactivity* timeout for guest identity only, leaving access-code authorization and authenticated account sessions unaffected, and leaving all stored data untouched regardless of guest expiry.

---

## 1. Executive Finding

The current guest identity mechanism is a signed, self-contained cookie (`guest_session`) with a **fixed 180-day lifetime from creation**, never refreshed while valid. This is original, intentional, unregressed architecture (single commit in its entire history — see Section 12), not a side effect of recent work.

Converting this to a **1-hour rolling inactivity window** requires a small, additive change to exactly two files (`lib/guestToken.js`, `proxy.js`) and **zero database changes**. The existing `access_ok` (access-code) mechanism and Auth.js account sessions are structurally independent of the guest cookie today, and remain independent under the proposed design — no shared state, no shared code path, no shared expiry logic. The existing client-side "identity changed under me" handling (`isKnownGuest` check in `app/page.js`) already reacts correctly to a guest identity changing without any new code, because it was built for a different but behaviorally identical scenario (a reset/forged guest cookie). Every data table is already scoped by `device_id`, so a new guest identity is structurally guaranteed to see none of an expired guest's data, without deleting it.

**No blocking issue was found.** See Section 15 for the final verdict.

---

## 2. Current Identity & Session Architecture (Ground Truth)

Three independent mechanisms currently coexist, verified directly from source (not from prior reports):

| Mechanism | Cookie | Defined in | Lifetime | Purpose |
|---|---|---|---|---|
| Access-code authorization | `access_ok` | `lib/accessToken.cjs`, `app/api/access/route.js` | Fixed 180 days from grant | Gates the whole app behind an access code (`proxy.js`) |
| Guest identity | `guest_session` | `lib/guestToken.js` | Fixed 180 days from creation (today) | Anonymous identity, owns rows via `device_id` |
| Account session | Auth.js session cookie | Auth.js (NextAuth), not app-owned | Auth.js default / configured elsewhere | Authenticated identity |

`lib/identity.js`'s `getIdentity()` is the **sole** source of truth used by every route handler:

```js
const session = await auth();
if (session?.user?.id) return { id: session.user.id, type: 'account' };
const guestId = verifyGuestToken(jar.get(GUEST_COOKIE)?.value);
if (guestId) return { id: guestId, type: 'guest' };
return null;
```

This order is critical: **account session is checked first and unconditionally short-circuits** — the guest cookie is never even inspected once a real account session exists. This is the structural guarantee that account sessions are unaffected by anything done to the guest cookie (Section 9).

`proxy.js` (middleware) runs before every request matched by `config.matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|sestia/).*)']` — meaning **static assets never reach the middleware body at all**, today and under the proposed change alike. Inside the middleware:

1. `PUBLIC_PATHS = ['/hosgeldin', '/giris', '/api/access', '/admin-giris', '/api/admin-access', '/api/health', '/giris-hatasi']` return immediately — no access-code check, no guest-cookie logic.
2. Admin paths (`/admin`, `/api/admin/*`) are handled in their own branch and also return before reaching guest logic.
3. For everything else, `access_ok` is checked; if invalid, the request is redirected to `/hosgeldin` (the access-code screen) — **this check has nothing to do with the guest cookie**.
4. Only after the access-code check passes does the guest-cookie block run:
   ```js
   if (!verifyGuestToken(req.cookies.get(GUEST_COOKIE)?.value)) {
     const { token, expiresAt } = createGuestToken();
     res.cookies.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: ..., expires: expiresAt, path: '/' });
   }
   ```
   Today this only *mints a new* guest cookie when the existing one is missing/invalid/expired. It never *renews* a still-valid one.

---

## 3. Current Cookie/Token Lifecycle (Exact)

**`access_ok`** (`app/api/access/route.js`, `lib/accessToken.cjs`):
- `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV==='production'`, `maxAge: 60*60*24*180` (180 days), `path: '/'`.
- Minted once when the correct access code is submitted. Never consulted or modified by guest logic.

**`guest_session`** (`lib/guestToken.js`):
- Format: `guestId.expires.signature` (HMAC-SHA256 over `guestId.expires`, keyed by `AUTH_SECRET`, verified with `crypto.timingSafeEqual`).
- `guestId`: `crypto.randomUUID()`, validated against a UUID regex on verify.
- `expires`: absolute epoch-ms timestamp, embedded in the signed payload. `verifyGuestToken` rejects if `Date.now() > expires`, or if the signature doesn't match, or if the guestId isn't a well-formed UUID.
- **Today: `GUEST_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000`, fixed at creation. `createGuestToken()` always generates a brand-new random `guestId` — there is no "renew this identity" path today.** The cookie is only replaced when `verifyGuestToken` returns null (missing, malformed, expired, or bad signature), per `proxy.js` Section 2.4 above.

**Account session (Auth.js):** not owned by this codebase's token modules; irrelevant to this change since `getIdentity()` never reaches guest logic for an account holder (Section 2).

---

## 4. Why Guest State Currently Persists So Long

By design: `GUEST_MAX_AGE_MS` is a large fixed constant and the cookie is never proactively refreshed. A guest who visits once and never returns keeps the *same* identity, and thus the *same* data ownership, for up to 180 days. This is a deliberate anonymous-continuity choice (guests without an account still get to keep their rooms/photos/decisions across visits) — but it means "guest" today behaves more like "persistent anonymous account" than "session." Confirmed via `git log --oneline -- lib/guestToken.js`: **exactly one commit in the file's entire history**, the original identity-system commit (`d0b4343`, 2026-09-21). This is longstanding architecture, not an oversight or regression.

---

## 5. Recommended Definition of "Meaningful Activity"

Activity = **any request that reaches the guest-cookie block in `proxy.js`**, i.e. any request that:
- is not a static asset (already excluded by `config.matcher`),
- is not a public path (`/hosgeldin`, `/giris`, `/api/access`, `/admin-giris`, `/api/admin-access`, `/api/health`, `/giris-hatasi` — already excluded),
- is not an admin path (already excluded),
- passed the `access_ok` check (i.e., the visitor is already inside the app).

This naturally and automatically excludes:
- Static assets (JS/CSS/images) — never reach middleware body.
- Health checks (`/api/health`) — explicitly public.
- The access-code screen itself and its submission endpoint — explicitly public; entering/retrying an access code is not "guest activity."
- Admin panel usage — separate branch, irrelevant to guest identity.

And naturally includes any real page load or API call the guest app makes while in use: loading `/`, calling `/api/state`, creating a room, uploading a photo, sending a chat message, requesting Toparla, etc.

**No new "activity classification" logic is needed** — this falls entirely out of the middleware's existing control flow. Confirmed via `grep -rn "setInterval" app/ components/ lib/` → **zero results**: there is no hidden client-side polling anywhere in the app that could silently generate "activity" and falsely extend a session. Every request that would touch this code path corresponds to a real user action or a real page navigation.

---

## 6. Recommended 1-Hour Inactivity Architecture

**Option chosen: Option A — rolling, self-contained signed cookie**, refreshed on every qualifying request. Rejected alternatives and why:

- **DB-based session/last-activity table:** requires a new table, a write on every request (cost + contention for no benefit), and duplicates information the cookie can already carry. Also would require a lookup on every request instead of a pure signature check — strictly more expensive and more code for an equivalent guarantee.
- **Existing activity/telemetry table reuse:** the app's telemetry (from the earlier read-only activity audit) is write-oriented/event logging, not designed for guest-existence-window checks, and coupling identity validity to an unrelated logging table is fragile (a telemetry outage or delay must never accidentally block or extend identity).
- **Rolling cookie (chosen):** identical pattern to what `access_ok`/`guest_session` already are — a signed token carrying its own expiry — just refreshed more often and with a shorter window. Zero new tables, zero new writes to SQLite, consistent with the existing security model (HMAC-signed, httpOnly, unguessable id).

**Exact mechanism:**

1. In `lib/guestToken.js`: change `GUEST_MAX_AGE_MS` from 180 days to **1 hour** (`60 * 60 * 1000`).
2. Give `createGuestToken()` an **optional** parameter: `createGuestToken(existingGuestId)`. If provided, reuse that id (renew-in-place); if omitted, generate a fresh `crypto.randomUUID()` (today's behavior, unchanged for the "new guest" case). This is backward compatible — every existing call site (`createGuestToken()`, no args) keeps working identically for the "mint new" case.
3. In `proxy.js`: change the guest-cookie block from "mint only if invalid" to "always renew, reusing the existing id when the current cookie is still valid":
   ```js
   const existingGuestId = verifyGuestToken(req.cookies.get(GUEST_COOKIE)?.value);
   const { token, expiresAt } = createGuestToken(existingGuestId || undefined);
   res.cookies.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: ..., expires: expiresAt, path: '/' });
   ```
   This unconditionally re-signs and re-sets the cookie, with a fresh `expires = now + 1h`, on every request that reaches this point — implementing the rolling window with no other change to which requests reach it.

`verifyGuestToken`'s own logic (signature check, UUID check, expiry check) needs **no changes at all** — only the duration used to compute `expires` at mint/renew time changes, and the "always renew" caller behavior in `proxy.js` changes.

"Last activity" has no separate stored representation — it **is** the expiry timestamp baked into the current cookie, exactly mirroring how `access_ok` already represents its own validity window. This is the minimal-state design: nothing to clean up, nothing to go stale in a separate table, nothing that can drift from the cookie itself.

---

## 7. Exact Post-Expiry UX (Reusing Existing Screens)

Tracing what actually happens today when a guest's cookie is invalid/expired and `access_ok` is still valid (this is **already** possible today, e.g., cookie cleared by the browser, or the 180-day window elapsing) shows the correct behavior is **already fully implemented**, with no new screens required:

1. Any request reaching `proxy.js` with an invalid/expired `guest_session` gets a **freshly minted** guest cookie (new random UUID) in the response, regardless of whether the change in Section 6 is applied.
2. The client's initial `/api/state` fetch (triggered on mount by `app/page.js`) resolves against `getIdentity()`, which now returns the **new** guestId, owning zero rows (`hasStartedWork:false`).
3. `app/page.js`'s existing `refreshHomeState` logic:
   ```js
   const confirmedGuestId = localStorage.getItem('sestia_guest_id_confirmed');
   const skippedName = localStorage.getItem('sestia_intro_skipped') === data.identityId;
   const hasName = data.identityType === 'guest' && (Boolean(getUserName(data.identityId)) || skippedName);
   const isKnownGuest = data.identityType === 'guest' && confirmedGuestId && confirmedGuestId === data.identityId && hasName;
   if (data.identityType !== 'account' && !isKnownGuest) setShowWelcome(true);
   else setView(landingView(data));
   ```
   Since `confirmedGuestId` (the OLD id, from localStorage) will never equal `data.identityId` (the NEW id), `isKnownGuest` is false, and `setShowWelcome(true)` fires — rendering the **existing in-app `WelcomeView`** (the hitap/name screen), an in-SPA React state change, **not** a navigation to `/hosgeldin`. `lib/client.js`'s `getUserName(currentGuestId)` already refuses to return a name unless the stored guestId matches the current one, so no stale name/preference leaks across the identity change either.
4. The access-code screen (`/hosgeldin`) is **not** shown, because it is gated purely by `access_ok`, which this design never touches. Only a genuinely invalid/missing `access_ok` triggers that redirect.
5. Once the user optionally names themselves (or skips) and proceeds, `landingView(data)` for a fresh, work-free guest identity returns the Keşif view — the same landing rule as any brand-new guest (Section 8).

**This entire flow already exists today** for the "cookie was reset" case; the 1-hour timeout simply causes it to trigger more often, under a well-defined condition, rather than being a rare edge case.

Note: this app has no deep-linkable content routes — the only non-auth page is `/` itself (`app/page.js`), and all in-app navigation is client-side `view` state, not real URLs. "Returning to a deep route" therefore reduces to "returning to `/`," which is exactly the case just traced.

---

## 8. Landing-Rule Interaction (Keşif vs. Ana Sayfa)

The existing landing rule (from commit `7789831`, "Land on Keşif or Ana Sayfa by real work, not by guest/account") already keys off **real stored work** (`hasStartedRealWork`, computed from `device_id`-scoped counts), not off guest-vs-account identity type. A brand-new post-expiry guest identity owns zero rows, so `landingView(data)` correctly returns **Keşif** for it — identical to any first-time guest. This rule requires no change and is verified to apply correctly to the *new* identity automatically, since it is itself already `device_id`-driven and identity-agnostic beyond that.

---

## 9. Security & Privacy Analysis

**Cross-identity data exposure — verified impossible by construction.** Exhaustive grep of every read/write against `rooms`, `room_photos`, `decisions`, `room_scans`, `room_analyses`, `chat_attachments`, and `toparla_results` in `lib/db.js`, `lib/toparlaStore.cjs`, `lib/chatAttachmentStore.cjs`, `lib/creationStore.cjs`, `lib/roomDecisionStore.cjs` confirms **every single query filters by `device_id = ?`** (the few exceptions use `session_key`, itself an unguessable UUID, for an unrelated one-off flow). Also confirmed `message_state` (PRIMARY KEY `device_id, category`) and `inspiration_cache` (PRIMARY KEY `device_id`) are likewise fully scoped. A new post-expiry guest identity is a fresh `crypto.randomUUID()`, structurally disjoint from any prior id — there is no code path anywhere that could let the new identity read, list, or infer the old identity's rows.

**Does the architecture require deleting the expired guest's data for security reasons? No.** Because ownership is enforced purely by an unguessable, disjoint `device_id` on every query, an orphaned row (old guest's data, no longer reachable by any cookie anyone holds) is not exposed to anyone — not the new guest, not any other guest, not any future visitor. It sits inert in the database. The only cost of not deleting it is storage growth over time, which is a data-retention/hygiene concern, not a security one, and is explicitly out of scope per the task's instructions. **No deletion is implemented or recommended.**

**Account/access-code isolation** — see Section 2 and Section 10; unaffected by construction, not by convention.

**Cookie security properties are unchanged:** still `httpOnly`, `sameSite: 'lax'`, `secure` in production, still HMAC-signed with `AUTH_SECRET`, still using `crypto.timingSafeEqual` for comparison. Shortening the lifetime and adding an identity-preserving renewal path does not weaken any of these properties — if anything, a 1-hour token is a strictly smaller exposure window than a 180-day one if a cookie value were ever leaked.

---

## 10. Account & Access-Code Isolation (Explicit Trace)

- **Access-code (`access_ok`):** Defined and checked entirely in `lib/accessToken.cjs` / `app/api/access/route.js` / the `access_ok` branch of `proxy.js`. No file that implements this change (`lib/guestToken.js`, the guest-cookie block of `proxy.js`) is read or written by that mechanism, and vice versa. The guest-cookie block runs *after* the access-code check already passed — it cannot influence whether that check passes.
- **Account session:** `getIdentity()` checks `auth()` first and returns immediately on a valid account session, **never** reaching `verifyGuestToken` at all in that case. `proxy.js`'s guest block still unconditionally ensures *some* valid guest cookie exists on every qualifying request — including for a logged-in account holder's browser — but this is inert: no route ever consults `guest_session` when an account session is present. This is true today and remains true unchanged.
- **Guest → account login transition:** email verification completes via a hard page reload (`window.location.assign(...)`) to a fresh page load. By the time that page loads, `getIdentity()` finds the new Auth.js session and returns `{type:'account', ...}` before ever inspecting the guest cookie. Even if the guest token expired in the middle of the email-code flow, it is irrelevant — the account branch short-circuits before the guest branch is reached. No corruption or cross-identity risk is possible here, by construction of `getIdentity()`'s precedence order (Section 2).

---

## 11. Conversation/Toparla Impact

The just-shipped Conversation V1 and account-gated Toparla V1 features are unaffected in the steady state (any activity within the rolling hour keeps the same guest identity, exactly as today). The one new scenario worth tracing explicitly is a tab left open **past** the inactivity window, then used again without an intervening full page reload (e.g., typing directly into an already-open chat composer and pressing send):

- The browser sends its (now-expired) `guest_session` cookie value on that first post-expiry API call (e.g. `/api/sestia-chat`).
- Two possible outcomes depending on Next.js's exact same-request cookie-propagation semantics between middleware and route handlers (this should be **verified empirically** during implementation, see Section 14, test #18 — not assumed):
  - **If the route handler sees the newly-renewed cookie for this same request:** the request proceeds as a *brand-new*, disjoint guest identity. Any reference to an old-guest-owned `chat_attachment_id` or Toparla target then fails ownership lookup (`getOwned(id, newDeviceId)` → not found) and the route returns its existing "not found"/error response — safe, no leak, just a normal-looking failure.
  - **If the route handler still sees the stale/expired cookie for this same request:** `getIdentity()` returns `null`, the route returns 401, exactly as it already does today for any other reason a guest cookie might be invalid (forged, cleared, corrupted).
- **Either outcome is safe** with respect to the critical property (no silent write/read as a resurrected old identity, no cross-identity leakage). Both are also already handled by the client's existing generic failure UI (the chat composer's existing retry/error path) — **no new client-side error handling is required** for correctness, though a more specific "your session expired, continuing as new" message would be a UX polish opportunity, not a correctness requirement (see Section 15, open questions).
- Toparla's account-gate is completely orthogonal to this: an *account* identity, once established, never touches guest logic at all (Section 10), so the timeout has zero effect on any account-Toparla flow. For the guest-only paths that remain unauthenticated + relevant-but-not-actionable (per the capability-truth architecture), the same "new disjoint guest, ownership check fails safely" reasoning applies.
- No change is required to `lib/chatCapabilities.cjs`'s relevance/authorization split, to exact-image structured-action targeting, or to any Toparla idempotency key — all of these already key off `device_id`/`attachmentId`, which continue to behave correctly (fail-safe, not fail-open) for a changed identity.

---

## 12. Edge Cases & Race Conditions

1. **10:00 start, active at 10:30, still active at 11:10 → must not expire.** Satisfied: every qualifying request re-signs the cookie with `expires = now + 1h`. Activity at 10:30 sets `expires = 11:30`; the 11:10 request is well inside that window, so it renews again to `12:10`. The token never reaches the 1-hour-since-last-activity boundary as long as requests keep arriving inside each window.
2. **Truly idle for >1 hour, then any request →** `verifyGuestToken` returns null (expired) → treated as no valid guest → a fresh identity is minted → Section 7's flow applies. No silent write occurs as the old identity (the old token simply fails verification; there is no code path that "resurrects" it).
3. **Two tabs, one active one idle.** Both tabs share the same browser cookie jar. Activity in the active tab renews the *shared* `guest_session` cookie; the idle tab automatically benefits from this on its own next request (it just sends whatever cookie value currently exists in the jar — cookies are not tab-scoped). No special multi-tab logic needed; this is the natural consequence of a shared httpOnly cookie, consistent with the existing architecture.
4. **In-flight request at the exact expiry boundary.** Each request is evaluated atomically and independently by `verifyGuestToken`'s single `Date.now()` comparison at the moment the middleware runs for that request; there is no window where a request is evaluated against a partially-updated state. A request that started just before expiry and is still processing when the boundary passes was already validated (or not) at entry — no re-check occurs mid-request.
5. **Guest begins login near expiry.** Traced in Section 10 — the account branch of `getIdentity()` takes precedence unconditionally once the session exists; guest-token expiry becomes irrelevant the moment login completes.
6. **Refresh exactly at the boundary.** Deterministic: whichever side of `Date.now() > expires` the single check falls on at that instant decides renew-in-place vs. mint-fresh. No undefined state.
7. **Normal vs. Incognito.** No special-casing needed or recommended: while an Incognito window is open, cookies/localStorage behave identically to a normal window (same-origin storage is unaffected by Incognito mode); closing the Incognito window simply discards everything, which is ordinary browser behavior already outside the app's control today.

---

## 13. Recent-Regression Assessment

Checked all four named commits for any change to guest/identity/session logic:

| Commit | Touches guest/identity/access files? | Verdict |
|---|---|---|
| `7789831` | No (`app/page.js` landing-rule logic only, keyed off work counts) | Not related |
| `1bb3946...` | No | Not related |
| `9b983f1...` | No | Not related |
| `9d49424...` | `lib/identity.js` — added `isAccountIdentity()`, a purely additive 8-line helper, zero change to existing guest/account resolution logic | Not related |

`git log --oneline -- lib/guestToken.js` shows **exactly one commit ever** (`d0b4343`, the original identity-system commit, 2026-09-21) — the file has never been touched since its creation. `git log --oneline -- proxy.js` shows 10 commits total, none of which are among the four named commits. **Conclusion: the current 180-day fixed-lifetime guest behavior is original, longstanding, intentional architecture — not a regression introduced by any recent work.**

---

## 14. Exact Implementation Plan (Not Yet Executed)

**Files to change (2, both already identified above):**

1. **`lib/guestToken.js`**
   - `GUEST_MAX_AGE_MS`: `180 * 24 * 60 * 60 * 1000` → `60 * 60 * 1000`.
   - `createGuestToken()` → `createGuestToken(existingGuestId)`: use `existingGuestId` when provided and well-formed (defensively re-validate the UUID shape rather than trusting the caller blindly), else `crypto.randomUUID()`. No change to `verifyGuestToken`'s contract or internals.

2. **`proxy.js`**
   - Guest-cookie block: read `existingGuestId = verifyGuestToken(...)` once, pass it into `createGuestToken(existingGuestId || undefined)`, and **always** call `res.cookies.set(...)` with the result (renew-or-mint unconditionally), instead of only minting when the existing token is invalid.

**No DB schema changes. No new tables. No new environment variables required for production behavior** (the 1-hour value can be a plain constant, matching how `access_ok`'s 180-day value is a plain constant today).

**Explicitly not changed:** `lib/accessToken.cjs`, `app/api/access/route.js`, Auth.js configuration, `lib/identity.js`'s precedence order, any `device_id`-scoped query, any deletion/cleanup logic (none is added).

---

## 15. Risks / Open Questions, Exact Regression Test Plan, and Verdict

### Open questions (non-blocking, worth a product decision but not a technical obstacle)
- Whether a specific "your guest session expired, you're starting fresh" message should be shown on a 401 caused by mid-session expiry, versus relying on the existing generic retry/error UI (Section 11). Recommend deferring this as a V1.1 polish item.
- Whether the exact same-request cookie-propagation behavior between `proxy.js` and a route handler needs to be pinned down before or during implementation (Section 11) — recommend verifying via test #18 below rather than assuming either way, since both outcomes are already safe.

### Test plan (maps the required 19 scenarios onto concrete files)

**New file — `tests/guest-token.test.cjs`** (pure unit tests, no server, no waiting real time): test `createGuestToken`/`verifyGuestToken` directly with hand-crafted `expires` values (constructed with a known `AUTH_SECRET` and manually computed HMAC signatures) to assert:
1. A token with `expires` 1ms in the future verifies successfully.
2. A token with `expires` 1ms in the past is rejected.
3. `createGuestToken(existingId)` reuses `existingId` exactly; `createGuestToken()` (no arg) generates a different, valid UUID each call.
4. A malformed/non-UUID `existingGuestId` argument is not blindly trusted (falls back to a fresh UUID, or is rejected — whichever the implementation adopts, tested explicitly).
5. Renewing a token with a new `expires` produces a new valid signature that verifies, and the old signature/token no longer being reused doesn't affect verification of the new one (independent tokens).
6. Existing forged/tampered-signature/tampered-guestId/tampered-expires rejection paths (already implied by current logic) still hold after the constant change.

**Extend existing `tests/guest-onboarding-e2e.test.cjs`** (already has an isolated `next dev` server + cookie-jar harness + guest A/B isolation fixtures — the right home for full-stack scenarios, not a new file):
7. A guest makes a request, then another request well inside the (test-shortened, if the harness supports it, or mocked-clock) window — same `guestId` persists (rolling renewal keeps identity).
8. A guest goes idle past the window, then makes a request — receives a **new, different** `guestId`.
9. Data created under the old guestId (a room, a photo, a decision) is **not** visible/listed under the new guestId.
10. Data created under the old guestId **still exists** in the DB after expiry (not deleted) — verified via direct DB read in the test, not via any app-facing API (since no API is meant to expose it to the new identity).
11. `access_ok` cookie is untouched by guest expiry — a guest whose identity just rotated does **not** get redirected to `/hosgeldin`.
12. An account session (real Auth.js login in the test harness) is completely unaffected by guest-cookie expiry — repeat existing account-resolution assertions with a deliberately expired/absent guest cookie present.
13. Two simulated tabs (two requests sharing one cookie jar) — activity via one "tab" renews the shared cookie such that the other "tab"'s subsequent request keeps the same identity.
14. Guest begins the email/account login flow near the expiry boundary; after completing login, identity resolves to the account, not a rotated guest.
15. `isKnownGuest` client-side reaction: after a simulated identity rotation, the app-level state that would drive `setShowWelcome(true)` is asserted (already indirectly covered by existing "new guest doesn't inherit previous guest name" fixtures — extend rather than duplicate if coverage gaps are found).
16. Landing rule: a freshly rotated guest identity with zero rows lands on Keşif (extend the existing `7789831`-era landing-rule tests, do not duplicate).
17. A `chat_attachment`/Toparla-result reference from the old guestId is inaccessible (404/not-found, not leaked) when requested under the new guestId — extends `tests/chat-attachments-route.test.cjs` / `tests/toparla.test.cjs` ownership-check patterns already present.
18. **Empirical verification of the same-request cookie-propagation question from Section 11:** simulate an API call carrying an expired guest cookie as the very first post-expiry request (no intervening page load) and assert the actual observed behavior (401, or safely-scoped-new-guest) — document whichever is observed as the confirmed behavior.
19. Static assets, `/api/health`, and the access-code screen/submission never cause a guest-cookie renewal (assert response has no `Set-Cookie: guest_session=...` for these paths) — confirms Section 5's activity definition is correctly inert for non-activity paths.

**Existing tests requiring no change:** `tests/private-access.test.cjs` (access-code logic, untouched), Toparla/Conversation ownership tests beyond item 17 (already correctly `device_id`-scoped and agnostic to *why* a device_id changed).

### Final Verdict

**SAFE TO IMPLEMENT AS DESIGNED.**

No blocking technical, security, or architectural obstacle was found. The change is additive/parametric to two files, requires no schema changes, does not risk data loss (no deletion is introduced), and is structurally isolated from access-code authorization and account sessions by the existing precedence order in `getIdentity()` and the existing branch structure in `proxy.js`. The two items in "Open questions" above are UX-polish and empirical-verification items to resolve *during* implementation, not decisions that block starting it.
