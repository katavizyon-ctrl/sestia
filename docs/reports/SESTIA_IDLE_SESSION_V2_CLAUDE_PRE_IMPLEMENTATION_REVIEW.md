# SESTIA — Identity-Aware True User Inactivity Session Policy — Claude Pre-Implementation Review

**Status:** READ-ONLY. No application code, test, or configuration was modified while producing this report. Nothing was committed, deployed, pushed, merged, or changed on Railway/environment variables. No live AI, email, or paid-provider call was made.

**Basis:** `docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md` (authoritative spec, final policy: guest 3m/5m, account 5m/10m) and `docs/reports/SESTIA_GUEST_SESSION_TIMEOUT_CODE_REVIEW.md` (the GST-01..07 review that motivated the redesign). Every claim from both documents cited below was independently re-checked against the actual current source in this repository, not taken on trust.

---

## 1. Repository State / HEAD

```
HEAD: a68405f58412cef150e9a7203a5991ba154a8d51  (fix: expire inactive guest sessions after one hour)
```

`git diff --stat` against HEAD shows **zero content changes to any tracked file** — only the pre-existing, unrelated deletion of `design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png` (present before this task, not touched by it).

`git status --short`:

```
 D "design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png"   ← pre-existing, unrelated
?? docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md            ← authoritative spec (Codex)
?? docs/reports/SESTIA_GUEST_SESSION_TIMEOUT_CODE_REVIEW.md           ← GST-01..07 review (Codex)
?? lib/sessionCredentials.cjs                                          ← partial Codex implementation
?? lib/sessionPolicy.cjs                                               ← partial Codex implementation
?? lib/sessionStore.cjs                                                ← partial Codex implementation
?? tests/session-store.test.cjs                                        ← partial Codex implementation
?? toparla-benchmark-15.png                                            ← pre-existing, unrelated
```

**Four new, untracked, unwired source/test files** constitute the partial Codex implementation. **No existing tracked file was touched** — `proxy.js`, `lib/identity.js`, `lib/guestToken.js`, `lib/auth.js`, `lib/db.js`, `app/page.js`, `components/SestiaExperience.js`, and every route handler are byte-identical to `a68405f`. The four new files are not imported or referenced anywhere in the application (confirmed by grep: nothing outside `tests/session-store.test.cjs` requires any of them). They are inert with respect to the running application; the live authorization path today is still exactly the `a68405f` one-hour rolling `guest_session` mechanism.

Nothing was reset, deleted, committed, or modified during this review, per instructions.

---

## 2. Authoritative-Spec Understanding

Read in full (600 lines). Summary of the locked design: a hybrid architecture (Option C from the spec's own three-option comparison) — two new additive SQLite tables (`sestia_session_families`, `sestia_sessions`) hold server-authoritative idle-session state for **both** guest and account identities; Auth.js keeps its JWT strategy but a verified-login-only JWT callback attaches a `sestiaSid`/policy version bound to a session row; a client-side "true activity" classifier (trusted `pointerdown`/`click`/`keydown`/`input`/`compositionend`/`change` only — explicitly excluding all read/background/telemetry/render/focus/visibility traffic) reports bounded, coalesced activity events to `POST /api/session/activity`; multi-tab coordination uses BroadcastChannel + storage-event fallback + Web Locks, with the server record as sole authority; guest timeout ends that guest's lifecycle permanently (new UUID next time, no inherited data); account timeout ends only the authentication session (same `auth_user.id` regains its persisted data after re-verification); `access_ok` and `AUTH_SECRET` are explicitly untouched; no data is ever deleted. Locked timing: guest warning 180000ms/timeout 300000ms, account warning 300000ms/timeout 600000ms, with `>=` semantics at the boundary (equality = expired). Section 22 lists an extensive file plan; Section 23 lists 58 numbered test scenarios plus five bullet groups of mandatory edge tests. Final verdict inside the spec itself: "SAFE TO IMPLEMENT THIS ARCHITECTURE" (architecture approval only, not a deployment authorization).

The spec is unusually rigorous for a design document: nearly every claim about the current codebase and about installed Auth.js internals cites an exact file/line, and (see Section 4 below) those citations check out against the real source, not just plausible-sounding prose.

---

## 3. Current Architecture Findings

Independently re-derived, not copied from either report:

- `lib/identity.js`: `getIdentity()` checks `auth()` (Auth.js JWT) first, unconditionally returns account identity if present; only then checks `verifyGuestToken(cookie)`. No shared idle policy exists today; nothing currently distinguishes "human interaction" from "any HTTP request."
- `proxy.js`: after the `access_ok` gate, unconditionally re-signs/renews `guest_session` on every request that reaches that point (the `a68405f` mechanism) — this includes `/api/state`, `/api/event`, `/api/error`, room/photo reads, media byte reads, and any mount-time request. This confirms GST-06's concern is real: today, *any* qualifying HTTP traffic — not deliberate interaction — extends a guest's window.
- `lib/auth.js`: JWT strategy, `maxAge: 30 * 24 * 60 * 60`. The file's own existing comment (predating this task) already documents, from direct verification of `@auth/core`, that the JWT's rolling refresh **only** happens on a real `/api/auth/session` request, not on `auth()` calls from Route Handlers — this is exactly the mechanism the new architecture explicitly says must **not** be conflated with human interaction (Section 5 below confirms this claim against the real package source).
- Private media: all four byte routes (`chat/attachments/[attachmentId]`, `rooms/[id]/photos/[photoId]`, `chat/toparla/[resultId]`, `rooms/[id]/toparla/[resultId]`) set `Cache-Control: private, max-age=31536000, immutable` — confirmed identical across all four, verbatim, by direct read (not assumed). This is pre-existing (predates `a68405f`) and is exactly GST-03.
- Client architecture: `app/page.js` is a single-page, client-state-driven SPA (`view` state, no real routes for Home/Keşif/Odalarım/Chat). `SestiaChat` is already keyed by `key={currentIdentityId}` (`app/page.js:1441`, confirmed) — a real, working precedent for "reset a private subtree when identity changes," but it only fires after a *successful* `/api/state` response updates `currentIdentityId`; a failed mutation never triggers it.
- `components/SestiaExperience.js`'s chat `send()` (read in full, lines 168–222): on any failure it restores `previousMessages`, `draft`, `attachedFile`, `attachedPreviewUrl` and shows a generic error — with **no check at all** for whether the identity/lifecycle changed in the meantime. This is the exact code GST-02 and architecture Section 15 target ("late error handlers must not restore previousMessages after the controller invalidated that lifecycle").
- `lib/client.js`'s `boba_last_room` (`getLastRoom`/`setLastRoom`) is confirmed **unscoped** by guest id (unlike `getUserName`, which is correctly guest-id-scoped). This is a small, real, previously-undocumented gap the new "reset private state by session lifecycle" work needs to also cover.
- No `setInterval`/polling loop exists anywhere in `app/`, `components/`, `lib/` (re-confirmed). `lib/telemetry.js`'s `logEvent`/`reportError` are fire-and-forget `fetch(..., {keepalive:true})` calls with no identity payload — real traffic, but not periodic.
- **No browser-automation testing library is installed.** `package.json` has no `devDependencies` at all; `node_modules` contains no Playwright, Puppeteer, jsdom, or testing-library package. All current tests are either pure `node:test` unit tests or a hand-rolled `fetch()`-based cookie-jar harness against a real `next dev` server (`tests/guest-onboarding-e2e.test.cjs`). This is a material, previously-unstated gap relative to what Section 23 requires (see Section 14).

No mismatch was found between the spec's description of the current architecture and the actual source — every specific citation I checked (file paths, line ranges, cookie names, cache headers, the `SestiaChat` key, the `window.location.assign` navigation, `boba_last_room`) was accurate.

---

## 4. Architecture-vs-Source Mismatches

None found that would block the design. Two small, non-blocking corrections/refinements to the spec's own file plan:

1. Section 22 lists `app/api/auth/[...nextauth]/route.js` as an expected touch point. Direct read shows this file is a two-line re-export: `export const { GET, POST } = handlers` from `lib/auth.js`. If `lib/auth.js` moves to a function-form `NextAuth((req) => ({...}))` config (confirmed supported, Section 7 below), this route file most likely needs **no change at all** — the touch point is fully contained in `lib/auth.js`. Worth confirming during implementation, not a blocker.
2. The spec's Section 3 mismatch table doesn't explicitly call out that `proxy.js`'s **private-owner branch** (`privateOwner()`, using `getToken()` directly, bypassing `getIdentity()` entirely) is a *third*, separate authorization code path — Section 9 of the spec does correctly call this out later ("Owner-only mode currently authorizes using `getToken` in proxy. That must also require the idle-session binding..."), so this isn't a real gap, just scattered across two sections; flagging it here so the eventual implementation plan doesn't miss it as a fourth call site (in addition to `getIdentity()`, private-media routes, and the new session routes).

---

## 5. Database/Session-Model Assessment

The proposed `sestia_session_families` + `sestia_sessions` schema was **not just read but executed**: the partial Codex file `lib/sessionStore.cjs` implements it verbatim (see Section 15) and its test suite (`tests/session-store.test.cjs`, 23 tests) **passes in full** against a real `better-sqlite3` `:memory:` database with an injected fake clock. This is strong, concrete evidence — not merely spec plausibility — that:

- The two-table model is expressible in the existing SQLite/better-sqlite3 layer with no new dependency.
- The proposed transaction/concurrency behavior (atomic activity-vs-expiry check, family-revision compare-and-swap for guest/account establishment, single-use login intents fenced by revision, idempotent same-key retry, non-revocation by a stale logout) is achievable using `db.transaction(fn).immediate()` — the same primitive already used elsewhere in this codebase for write-lock-safe operations (existing passing test: "two SQLite connections overlap confirmations: loser rolls back, retry replays").
- Exact-boundary semantics (`>=` at expiry, warning at `>=` but `< idleExpiresAt`) were tested at `delta ∈ {-1, 0, +1}` ms for both guest and account, with a fully injected clock (fixing GST-05 at this layer — no `Date.now()` dependency anywhere in the test).

One interpretation question worth resolving explicitly before implementation (not a blocker, see Section 17): `sessionStore.cjs`'s `check()` treats a session as **immediately revoked** if the *current* `resolvePolicy()` output no longer matches the session's own stored `policy_version`/`idle_timeout_ms`/`warning_after_ms`. The spec's Section 18 says to store an "immutable per-session snapshot" specifically so that "policy changes require an explicit version/transition rather than silently changing existing rows" — this phrasing could mean either (a) a live session should keep running on its own frozen values even if the deployed policy resolver's output changes, or (b) any drift from the current policy should revoke it, forcing re-establishment. Codex chose (b). Both are defensible; (b) is the more conservative, fail-closed choice, but it has a real operational consequence: **retuning `SESTIA_SESSION_POLICY`'s resolved values (e.g. widening the guest window) would immediately revoke every currently-active session**, not just new ones. This is a product decision, not an implementation detail (see Section 17).

---

## 6. Guest Lifecycle Assessment

The proposed V2 guest lifecycle can replace `lib/guestToken.js`/`proxy.js`'s request-renewal model without breaking any of the named product surfaces, **provided** the full client-side reset work (Section 8/10 below) is done alongside it — the store alone is not sufficient:

- **Guest onboarding / optional name / nameless guest:** unaffected in mechanism — `app/page.js`'s `isKnownGuest`/`sestia_guest_id_confirmed`/`getUserName` logic already reacts correctly to "identity changed under me" (built for the pre-existing cookie-reset case), and continues to work verbatim once the *source* of the new identity is a v2 session's `subject_id` instead of a v1 guest UUID. No product-visible onboarding screen changes.
- **Guest ownership:** unaffected — every store (`rooms`, `room_photos`, `decisions`, `chat_attachments`, `toparla_results`, etc.) keys off `device_id`/`ownerId`, which the new resolver must continue to supply as the guest's `subject_id` (never the session id) — the spec is explicit and correct about this distinction ("Continue using ownerId, not sessionId, for device_id store queries").
- **Landing rule:** unaffected — `landingView()` is driven by real work counts, identity-type-agnostic; a fresh v2 guest subject with zero rows lands on Keşif exactly as today.
- **Existing room/item flows:** unaffected in ownership terms; the *only* change needed is that every route currently calling `getIdentity()` must instead resolve through the new session-aware resolver (`lib/session.js`, not yet built) so that an idle-expired guest is rejected even though its old `guest_session`/new `sestia_guest_v2` cookie value is still technically well-formed.

This is a genuinely additive replacement at the ownership layer — no existing store, migration, or ownership query needs to change.

---

## 7. Account/Auth.js Lifecycle Assessment

This was the highest-risk area of the spec (specific claims about installed package internals), so it was verified directly against the installed `next-auth@5.0.0-beta.32` / `@auth/core@0.41.3` source rather than trusted:

| Spec claim | Verification | Result |
|---|---|---|
| JWT session read (`GET /api/auth/session`) does not treat a plain read as `signIn`/`signUp` | Read `@auth/core/lib/actions/session.js` directly: `callbacks.jwt({ token: payload, ...(isUpdate && { trigger: 'update' }), session: newSession })` — `trigger` is only ever `'update'` or absent, **never** `'signIn'`/`'signUp'`, on a session read | **Confirmed accurate** |
| A plain session read still re-signs and refreshes the JWT's cookie expiry | Same file: `jwt.encode(...)` + `sessionStore.chunk(newToken, {expires: newExpires})` unconditionally on every successful decode | **Confirmed accurate** — matches this repo's own pre-existing comment in `lib/auth.js` |
| `signOut` decodes the JWT, fires `events.signOut`, clears cookies, but does not invalidate other copies of that JWT | Read `@auth/core/lib/actions/signout.js` directly: exactly this, no server-side revocation list touched | **Confirmed accurate** |
| Verified email login issues the JWT callback with `trigger: 'signIn'`/`'signUp'` | Grepped `@auth/core/lib/actions/callback/index.js`: `trigger: isNewUser ? "signUp" : "signIn"` at 4 call sites, all inside the verified-callback branch | **Confirmed accurate** |
| Request-scoped Auth.js config (function form) is supported, enabling family/login-intent binding without module globals | Read `next-auth/lib/index.js`'s `initAuth()`: explicit `typeof config === 'function'` branch that resolves `config(req)` per request before calling `Auth()` | **Confirmed accurate and directly usable** |
| Retaining JWT strategy (not switching to adapter DB sessions) is sufficient | `lib/authSchema.js` has no Auth.js sessions table (by design, JWT strategy); adding one is correctly avoided by the spec | **Confirmed consistent with current schema** |

**No case was found where the spec assumes an Auth.js behavior the installed version does not support.** The one real implementation cost: `lib/auth.js` currently calls `NextAuth({...})` with a plain object; binding callback issuance to a request-scoped family/login-intent (as the spec requires to avoid module-global state) means converting this to `NextAuth((req) => ({...}))`. This is a real, moderate refactor of `lib/auth.js`'s top-level shape (its `sendVerificationRequest`, `adapter` wrapper, and `events.createUser` hook all need to keep working unchanged inside the new per-request closure) — not large, but nontrivial, and worth budgeting explicitly in the implementation plan.

`app/api/auth/[...nextauth]/route.js` (a 4-line re-export of `handlers`) needs no change under this refactor, as noted in Section 4.

---

## 8. True-User-Activity / Client Assessment

The centralized browser lifecycle controller described in Sections 4/10/12 of the spec is integrable with the current app structure, but touches a genuinely large surface because the app has **no existing central place** any of this logic could hook into today:

- `app/page.js` (1441+ lines) manages all navigation via local `view` state and has no existing top-level "private subtree" boundary to key by lifecycle — the spec's plan to add `key={sessionLifecycleId}` around the entire private tree (mirroring the existing `SestiaChat key={currentIdentityId}` precedent) is architecturally sound but is a new, larger-radius version of a pattern that today only wraps one component.
- Conversation (`components/SestiaExperience.js`'s `send()`): confirmed exact failure-path code that needs a lifecycle-invalidity check added before it restores `previousMessages`/`draft`/`attachedFile` (Section 3/15 above) — this is a precise, small, identifiable change once `lib/sessionClient.cjs`/`SessionLifecycleProvider` exist, not a redesign of the chat flow.
- Photo picker / decision controls / room flows / Toparla: all use plain `<input>`/`<button>` handlers already, which is exactly the shape the spec's classifier wants (`change` on file inputs, `click`/`keydown` on controls) — a single capture-level root listener can pick these up without per-component instrumentation, **except** where a component already calls `event.preventDefault()`/`stopPropagation()` in a way that could suppress bubbling to a root listener; this needs to be checked component-by-component during implementation (not found to be a problem anywhere I sampled, but not exhaustively verified for every control).
- Mobile interaction paths: file-picker `change` events firing after returning from a native photo picker, and touch-originated `pointerdown`, are both explicitly and correctly handled by the spec's event table.

**Event-classification trap identified:** the spec's warning-dismissal exclusion ("Exclude warning-only dismissal controls from the root pointer/click/keyboard activity classifier ... a generic capture listener must not accidentally classify them as activity") requires the eventual warning UI's dismiss control (if any) to either stop propagation before the root capture listener or be tagged/allowlisted out — this is a real, easy-to-get-wrong detail worth a dedicated test (already present as scenario #28 in the spec's own list).

---

## 9. Multi-Tab Assessment

BroadcastChannel + storage-event fallback + Web Locks is compatible with the current browser/client architecture (a plain SPA, no existing service worker or cross-tab code today, so no conflict to resolve) — but **none of this infrastructure exists yet**, and none of it is testable with the current test toolchain (Section 14). The design does **not** weaken the server-authoritative model: every cross-tab message in the spec carries only non-secret metadata (lifecycle id/revision, warningAt/deadline, transition reason) and every tab still independently re-validates against the server (`GET /api/session`, non-renewing) before trusting a broadcast — this was checked against the spec's own explicit language in Section 10 ("A tab's local timer never unconditionally signs everybody out," "Local notification values do not grant access or change the server deadline") and is architecturally consistent with the `sessionStore.cjs`'s family-revision-based arbitration already implemented and tested (Section 15).

---

## 10. Private-State Reset Assessment

Reviewed the concrete state that must be cleared on confirmed timeout, cross-checked against actual current state shapes:

- **Room/photo/analysis state:** lives in `app/page.js`'s local state (`rooms`, room-detail state) and is refetched from `/api/state`/`/api/rooms` on identity change — already naturally cleared once a session-lifecycle key remounts the private subtree, no special-casing needed beyond the remount itself.
- **`SestiaExperience`/conversation state:** `messages`, `draft`, `attachedFile`/`attachedPreviewUrl`, suggested action, Toparla confirm/result UI — all local component state, already fully torn down by unmount (the `key={currentIdentityId}` precedent proves this pattern works); the only *new* code needed is (a) widening the key to session-lifecycle scope and (b) the send()-failure-path guard from Section 8.
- **`attachedFile`/preview specifically:** `removeAttachment()` already calls `URL.revokeObjectURL(attachedPreviewUrl)` — the existing object-URL-revocation discipline the spec's Section 13/Section 12 step 3 asks for already exists as a pattern in this exact file; it just needs to also fire on confirmed-timeout, not only on explicit removal.
- **Toparla context/result:** same component-local-state story as chat; no server-side transcript exists to worry about leaking (confirmed: `/api/sestia-chat` does not persist chat text, per existing test `no chat text is ever written to the database`).
- **Late async error handlers:** the one concrete trap found is exactly the `send()` catch block in Section 3/8 above. No other late-handler restoration pattern was found elsewhere in a sampled read of `SestiaExperience.js`'s upload/analysis flows, though a full line-by-line audit of every async catch block in that file (it is large) was not performed in this review and should be a specific implementation-time checklist item.
- **`boba_last_room`:** confirmed unscoped (Section 3) — must be added to the private-state-clearing list; it is not mentioned by name in the spec's Section 12 clearing list, which does say "and `boba_last_room`" in Section 3's mismatch table but not explicitly in the Section 12 step-by-step clearing procedure. Minor spec inconsistency (present in one section, omitted from the operational checklist in another) — worth reconciling during implementation, not a blocker.

---

## 11. Private-Media / Cache Assessment

All four routes named by the architecture were opened and read in full (not sampled):

- `app/api/chat/attachments/[attachmentId]/route.js`
- `app/api/rooms/[id]/photos/[photoId]/route.js`
- `app/api/chat/toparla/[resultId]/route.js`
- `app/api/rooms/[id]/toparla/[resultId]/route.js`

All four are confirmed byte-for-byte consistent in shape: `getIdentity()` → 401 if absent → ownership-scoped lookup (`getOwned`/`getRoomPhotoFile`/`getResultFile`, all `device_id`-checked) → 404 if not owned/not found → read file bytes → `new NextResponse(bytes, { headers: { 'Content-Type': ..., 'Cache-Control': 'private, max-age=31536000, immutable' } })`. Changing all four to `Cache-Control: private, no-store` (success **and** error responses, per the spec) is a small, mechanical, four-file change with no ownership-logic risk — the hard part is exactly what the spec identifies as hard: **already-cached responses under the old header cannot be retroactively invalidated by a new header**, so the spec's proposed mitigation (new URL query-string version/lifecycle partition + testing instruction to close/refresh old tabs and clear site cache at staging cutover) is the correct and really the only available mitigation; there is no code-only fix for already-cached bytes. This matches GST-03's own conclusion. No blocker; this is a deploy-process step, not an implementation gap.

---

## 12. Conversation Assessment

Active Conversation V1 behavior (text, image-only, image+text, attachment ownership, context resolution, contextual actions, exact-image targeting, Conversation → Toparla) is untouched at the **server** logic level by this redesign — every relevant mocked-provider test (`sestia-chat-route`, `chat-multimodal`, `chat-context`, `chat-capabilities`) exercises route/store logic that only depends on `getIdentity()`'s *output shape* (`{id, type}`), not on how that identity was resolved. Since the new `lib/session.js` resolver is specified to preserve exactly that output shape, these tests should continue to pass unmodified once the resolver is swapped in — this is a structural argument, not yet empirically re-run (the resolver doesn't exist yet to test against). The one behavior that **must** change is the failure-path restoration in `send()` (Section 8), and the conversation-reset-on-timeout requirement (Section 15 of the spec) is new client behavior, not a server regression risk. No server-side transcript persistence is added, consistent with "no transcript persistence" instruction — confirmed no such persistence exists today.

---

## 13. Toparla Assessment

- **Account-only gate:** confirmed unchanged by this redesign in principle — both Toparla routes check `isAccountIdentity` before claiming; the new session resolver only changes *how* identity is established, not this check.
- **Explicit confirmation, exact source, idempotency, no automatic paid retry:** all confirmed intact in the current store (`lib/toparlaStore.cjs`: `claimGeneration`/`claimGenerationFromAttachment` use `UNIQUE(device_id, operation_key)`-style claim-before-call semantics per the existing, already-tested implementation) — nothing in the new architecture touches this claim logic; the spec correctly scopes its Toparla change to *when the claim boundary re-validates session activity* (Section 16: "in a short DB transaction, verify the current session is active and atomically claim the Toparla operation"), layering on top of, not replacing, the existing claim.
- **Pre-timeout accepted operation may complete:** consistent with the existing store's design (an accepted claim is a durable row; nothing about it depends on the *session* remaining active after acceptance) — no store change needed for this property, only for the *acceptance boundary check itself*.
- **`GET /api/toparla/operations` feasibility:** directly inspected `lib/toparlaStore.cjs`'s full export surface: `getOwnedPhoto, claimGeneration, claimGenerationFromAttachment, finalizeGeneration, getResult, getResultFile`. **Confirmed: no existing method returns a bounded, owner-scoped list of recent operations.** The spec's claim "It has result-by-ID/file methods but no suitable public read-only operation recovery API" is accurate. Adding one is a small, additive, non-destructive change (a new `SELECT ... WHERE device_id = ? ORDER BY created_at DESC LIMIT n` style method plus a new thin route) — no schema change needed, since `toparla_results` already carries every needed column (`device_id`, `operation_key`, status, source ids).

No provider call, live or stubbed-but-real, was made anywhere in this review.

---

## 14. Test-Harness Assessment

This is the section where the spec's ambition most exceeds the repository's **current** capability, and it deserves to be stated plainly:

- **Store/policy/unit-level tests (spec scenarios #1–25, most of #34–40, #54–58):** fully feasible today, and **already partially proven feasible** — `tests/session-store.test.cjs` (Codex's partial work) already implements and passes 23 tests covering almost exactly this category, using the existing `node:test` + injected-clock + isolated `better-sqlite3(':memory:')` pattern already used elsewhere in this repo (e.g. `tests/chat-toparla-route.test.cjs`'s VM-extraction technique). No new tooling required for this tier.
- **Route/Auth.js integration tests (scenarios around #20, #36–39, native callback flows):** feasible using the existing `tests/guest-onboarding-e2e.test.cjs` pattern (a real isolated `next dev` server, a hand-rolled `fetch()` cookie jar, direct SQLite fixture manipulation for verification tokens) — this repo already proves this pattern works for exactly this kind of scenario (the existing file already drives real Auth.js email-code verification end to end without sending real email). Extending it for family/session-cookie flows is realistic engineering effort, not a tooling gap.
- **Real-browser scenarios (BFCache/`pageshow`, Web Locks availability/fallback, BroadcastChannel delivery, "browser cache enabled" media-reuse verification, real elapsed multi-minute idle with an actual foreground/backgrounded tab, mobile file-picker `change` events, assistive-technology click activation, trusted-vs-synthetic event filtering):** **not feasible with the current test infrastructure.** `package.json` has no `devDependencies`, and no Playwright/Puppeteer/jsdom/testing-library package is installed anywhere in `node_modules`. The spec's own Section 23 preamble explicitly requires "Browser tests run a real cache-enabled browser with controllable test-only clock/server fixtures" — this capability does not exist in this repository today and must be added (most likely Playwright, given it can drive a real Chromium with cache enabled, controllable clock via CDP, and BroadcastChannel/Web Locks support) before roughly a dozen of the 58 scenarios and several of the "mandatory edge tests" bullets can be written at all, let alone pass.

**The full 58-scenario + edge-test matrix is not reducible and should not be reduced** (per the task's explicit instruction), but it is **not fully implementable without a new dependency**. This is a concrete, actionable gap: budget an explicit "add a browser test runner" step before attempting the real-browser-only subset of Section 23, rather than discovering the gap mid-implementation.

---

## 15. Partial Codex Change Inventory — KEEP / REWORK / DISCARD

| File | Verdict | Reasoning |
|---|---|---|
| `lib/sessionPolicy.cjs` | **KEEP** | 7 lines, exact match to spec Section 19 (single named `staging-idle-v2` policy, frozen per-kind snapshot, fails closed on unknown policy/kind). No issues found. |
| `lib/sessionCredentials.cjs` | **KEEP** | Correctly domain-separates guest/scope/intent purposes into the HMAC input (`sestia-session-v2:{purpose}:{id}`) while reusing the existing `AUTH_SECRET` — satisfies both "don't rotate AUTH_SECRET" and "domain-separate so old tokens can't be reinterpreted" simultaneously. Versioned (`v2.` prefix), timing-safe compare, rejects malformed/wrong-purpose/wrong-secret/extra-segment values. One forward-looking note, not a defect: `mac()` requires the signed `id` to be strictly UUID-shaped for **all three** purposes including `'intent'`, which isn't exercised by any code yet — confirm this holds once the login-intent route is built (a `randomUUID()`-generated intent value satisfies it today by construction, so this is a latent coupling to watch, not a bug). |
| `lib/sessionStore.cjs` | **KEEP** | The most substantial and highest-value piece of partial work. Implements the full two-table schema exactly as specified (fields, CHECK constraints, unique/index definitions), and implements `bootstrap`/`guest`/`account`/`loginIntent`/`activity`/`logout`/`check`/`claim` with correct atomicity (`db.transaction(...).immediate()`), correct monotonic activity (`max(lastActivity, eventAt)`), correct family-revision compare-and-swap for establishment, correct idempotent same-key retry (15s window, still-active check), correct single-use login-intent fencing by revision, and correct non-revocation of a successor session by a stale logout. This directly and substantively addresses GST-04 (concurrent rotation) and GST-05 (flaky boundary test) at the store layer. One product-decision-worthy behavior to confirm before relying on it further: `check()` revokes a session outright the instant the *current* policy resolver's output differs from the session's own stored snapshot — see Section 5/17. Not wired into `lib/db.js` or any route yet (expected, out of scope for what Codex reached). |
| `tests/session-store.test.cjs` | **KEEP** | 23 tests, all pass against the actual `lib/sessionStore.cjs`/`lib/sessionPolicy.cjs`/`lib/sessionCredentials.cjs` using a fully injected fake clock (fixes GST-05 directly — no `Date.now()` dependency in any assertion). Covers exact `{-1,0,+1}` ms boundaries for both warning and expiry, both kinds; monotonic/out-of-order activity rejection; out-of-window (>15s) rejection; idempotent creation-key retry; stale-key rejection after the session ends; cross-device independence; stale-logout non-revocation of a successor. This is genuinely good, deterministic test engineering and maps cleanly onto a meaningful fraction of the spec's own scenario list (#1–19, #21–25 substantially, #34/#38/#39/#57/#58 partially). Nothing to rework. |

**No file should be discarded.** All four are correct, narrowly-scoped, spec-faithful, and independently verified (by running them, not just reading them) to work as intended. They represent the lowest-risk, most mechanically-verifiable third of the total implementation effort (the pure server-side state machine) and are a solid foundation to build the rest on. The much larger remaining surface — `lib/session.js`, all new `/api/session/*` routes, the `lib/auth.js` request-scoped refactor, `proxy.js`'s rewrite, the four private-media route updates, the entire client-side controller/`SessionLifecycleProvider`/BroadcastChannel/Web Locks layer, `app/page.js` and `SestiaExperience.js` integration, and the `GET /api/toparla/operations` addition — does not exist yet in any form.

---

## 16. GST-01 Through GST-07 Implications

| Finding | Addressed by this architecture? |
|---|---|
| GST-01 (legacy long-lived guest tokens still authorize) | **Yes, by design, once wired.** The new resolver (`lib/session.js`, not yet built) is specified to never fall back to `lib/guestToken.js`/`verifyGuestToken`; Section 17 of the spec explicitly requires rejecting both the original 180-day and the `a68405f` one-hour format. Not yet true today (nothing is wired), but the design fully closes this gap once implemented. |
| GST-02 (stale open UI, poisoned old references) | **Addressed by design** (Sections 8/10/12/15 of the spec) but **not yet implemented** — this is the single largest remaining body of client-side work identified in this review (Section 8/10 above). |
| GST-03 (long-lived immutable private-media caching) | **Addressed by design** (`no-store` + URL versioning, Section 14 of spec) but requires a deploy-time cache-transition step that no header change alone can retroactively fix — correctly acknowledged by the spec itself, not a gap in the design. |
| GST-04 (concurrent expired requests minting competing identities) | **Solved and independently verified** at the store layer — `sessionStore.cjs`'s family-revision compare-and-swap plus idempotent creation-key retry, proven by passing tests, is a real fix, not just a design intent. |
| GST-05 (flaky real-`Date.now()` boundary test) | **Solved and independently verified** — the new test suite uses a fully injected clock throughout; zero flakiness risk from this pattern. |
| GST-06 (background/request traffic treated as activity) | **Addressed by design** (explicit trusted-event allowlist, both client-side classifier and server-side `EVENTS` allowlist in `sessionStore.cjs`'s `activity()`) — the server-side half of this is already implemented and tested; the client-side classifier does not exist yet. |
| GST-07 (retention is a separate future concern, not deletion) | **Correctly not addressed by design, on purpose** — the spec is explicit and consistent throughout (every lifecycle-ending path: idle, logout, replaced — never deletes rows or files) that data retention remains explicitly out of scope, exactly matching this repo's own prior locked instruction on the subject. This is correct scoping, not a gap. |

---

## 17. Blockers

**No architectural or technical blocker was found.** Two items require an explicit product/architecture decision from you before or during implementation (distinguished from ordinary implementation detail below), and one item is a concrete infrastructure gap to plan for rather than discover mid-work:

1. **Product decision — does a live session survive a policy-value change, or does any drift from the currently-resolved policy immediately revoke it?** (Section 5.) The spec's prose supports either reading; the partial implementation already picked the conservative "revoke on drift" behavior. This has a real operational consequence (retuning timing values force-ends every active session, staging or — eventually — production) and should be a conscious choice, not an accident of whichever engineer wrote `check()` first.
2. **Product decision — should the `privateOwner()` single-owner mode (`/ozel-giris`, personal-deployment gate using `getToken()` directly in `proxy.js`) be subject to the same account idle policy as the main multi-user app, or exempted?** The spec's Section 9 says it "must also require the idle-session binding," but this mode serves a different purpose (a single trusted owner's own deployment) and forcing a 10-minute re-login there may or may not be wanted. Worth a one-line confirmation before implementation touches `proxy.js`'s private-owner branch.
3. **Infrastructure gap, not a decision — no browser-automation test tool is installed.** (Section 14.) This doesn't block starting implementation (the server-side two-thirds of the work is fully testable today), but it does block completing roughly a dozen of the required 58 scenarios and several mandatory edge tests. Plan to add one (Playwright is the natural fit given the cache/BFCache/Web-Locks/BroadcastChannel requirements) as an explicit early step, not a late surprise.

Neither product decision changes the recommended architecture itself — both are parameter/scope choices within it.

---

## 18. Exact Recommended Implementation Order

Informed by which pieces already exist (Section 15) and which have hard dependencies on each other:

1. **Resolve the two product decisions in Section 17** (five-minute conversations, not engineering work) before writing code that depends on their answers.
2. **Add a browser test tool** (Playwright recommended) as its own small, isolated step — unblocks writing (not yet running) the real-browser test subset early, in parallel with the rest.
3. **`lib/db.js`**: wire `createSessionStore` (already built and tested) into the real database connection, following the existing self-bootstrapping-store convention already used by `creationStore.cjs`/`toparlaStore.cjs`/etc.
4. **`lib/session.js`** (new): the typed resolver wrapping `sessionStore.check`/credentials verification — the single new chokepoint every protected surface will call instead of `getIdentity()`/raw `verifyGuestToken`.
5. **New `/api/session/*` routes** (`bootstrap`, activity, guest, login-intent, logout) plus `GET /api/session` — these can be built and fully tested (store layer already proven) before touching any existing route.
6. **`lib/auth.js`** request-scoped refactor + verified-login `sestiaSid` issuance + `events.signOut` binding — the highest-technical-risk remaining step, but now de-risked by Section 7's confirmation that the installed package supports exactly this mechanism.
7. **`proxy.js`** rewrite: remove automatic guest mint/renew, add the new session/family cookie bootstrap and the (decision-pending) private-owner binding.
8. **`lib/identity.js`** delegation to the new resolver, preserving its existing `{id, type}` output contract so Conversation/Toparla/room routes need no logic changes (Section 12/13).
9. **Four private-media routes**: `no-store` + URL versioning — small, mechanical, independent of everything else; can happen any time after step 4.
10. **`GET /api/toparla/operations`** + `lib/toparlaStore.cjs` read method — small, independent, any time after step 4.
11. **Client-side layer** (`lib/sessionClient.cjs`, `SessionLifecycleProvider`, `lib/sessionFetch.js`, `lib/privateMedia.js`): can be built and unit-tested (pure logic) in parallel with steps 6–10, but final integration into `app/page.js`/`SestiaExperience.js` needs steps 4–8 done first.
12. **`app/page.js` / `SestiaExperience.js` integration**: the largest single remaining body of work (Section 8/10) — last, because it depends on everything above.
13. Full regression pass of every existing Toparla/Conversation/room/guest-onboarding suite, plus the new Section 23 matrix, before any staging conversation.

---

## 19. Files Expected to Be Added/Modified

Matches the spec's own Section 22 table, cross-checked against actual current file locations (all confirmed to exist at the stated paths except the "new" ones, which are confirmed **not** to exist yet):

**New:** `lib/session.js`, `app/api/session/route.js`, `app/api/session/bootstrap/route.js`, `app/api/session/activity/route.js`, `app/api/session/guest/route.js`, `app/api/session/login-intent/route.js`, `app/api/session/logout/route.js`, `lib/sessionClient.cjs`, `components/SessionLifecycleProvider.js`, `lib/sessionFetch.js`, `lib/privateMedia.js`, `app/api/toparla/operations/route.js`, plus new test files (`session-policy` tests already exist inline in `session-store.test.cjs`; still need `session-client.test.cjs`, `session-routes.test.cjs`, `session-auth.test.cjs`, a browser-fixture suite once Playwright is added).

**Already present (partial, KEEP):** `lib/sessionPolicy.cjs`, `lib/sessionCredentials.cjs`, `lib/sessionStore.cjs`, `tests/session-store.test.cjs`.

**Modified:** `lib/db.js`, `lib/identity.js`, `lib/auth.js`, `proxy.js`, `lib/guestToken.js` (retire from authorization), `app/page.js`, `components/SestiaExperience.js`, `lib/client.js` (scope `boba_last_room`), `lib/roomScanClient.cjs`, `lib/telemetry.js`, `components/FeedbackButton.js`, `components/GlobalErrorReporter.js`, the four private-media routes, `lib/toparlaStore.cjs` (new read method), `app/layout.js`/`app/sestia.css` (if a warning UI needs global styling hooks), `app/ozel-giris/page.js`/`app/admin/page.js` (pending decision #2 in Section 17). `app/api/auth/[...nextauth]/route.js` likely does **not** need changes (Section 4/7).

Every protected existing API route (`state`, `rooms`, `rooms/[id]`, `rooms/[id]/scan`, `rooms/[id]/photos`, `decide`, `analyze`, `inspiration`, `sestia-chat`, `chat/attachments`, `chat/toparla`, `rooms/[id]/toparla`, `event`, `feedback`, `error`) needs its `getIdentity()` call path re-pointed at the new resolver — mechanically uniform across all of them since `lib/identity.js` is the single chokepoint, per step 8 above.

---

## 20. Final Verdict

**SAFE TO IMPLEMENT WITH THESE SPEC CLARIFICATIONS**

The architecture is sound, internally consistent, and its highest-risk technical claims (Auth.js internal behavior) were independently verified against the actual installed package source and found accurate in every case checked. The partial Codex implementation (`lib/sessionPolicy.cjs`, `lib/sessionCredentials.cjs`, `lib/sessionStore.cjs`, `tests/session-store.test.cjs`) is correct, well-tested by an independently-run passing suite (23/23), and should be kept as the foundation — nothing found warrants reworking or discarding it. No mismatch between the specification and the current source was found that constitutes a blocker; the two mismatches noted (Section 4) are minor scope refinements, not defects.

Two genuine product/architecture decisions need a short, explicit answer before or during implementation (Section 17, items 1–2) — these are choices within the recommended architecture, not reasons to change it. One real infrastructure gap (no browser-automation test tool installed) must be closed to fully satisfy the Section 23 acceptance matrix as written, but does not block starting the (larger) server-side implementation, which is testable today with existing tooling.

This review does not authorize implementation, commit, deployment, or any Railway/environment change — per the task's instructions, none of that was done, and none is recommended to start until you've seen this report.
