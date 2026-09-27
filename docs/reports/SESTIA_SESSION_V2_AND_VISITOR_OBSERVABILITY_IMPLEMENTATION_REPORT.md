# SESTIA — Session V2 + Visitor Observability — Implementation Report

**Basis:** `docs/reports/SESTIA_30_MIN_IDLE_SESSION_ARCHITECTURE.md` (authoritative architecture), `docs/reports/SESTIA_IDLE_SESSION_V2_CLAUDE_PRE_IMPLEMENTATION_REVIEW.md` (pre-implementation review, KEEP verdict on partial Codex work), `docs/reports/SESTIA_TEST_USER_ACTIVITY_VISIBILITY_AUDIT.md` and `docs/reports/SESTIA_VISITOR_SESSION_METADATA_OBSERVABILITY_AUDIT.md` (visitor observability audits).
**Implementation base:** `a68405f58412cef150e9a7203a5991ba154a8d51`.
**Status:** Implemented, tested (Node + real-browser), built successfully. Not pushed, not deployed, no Railway/environment change made to any remote environment.

---

## 1. Architecture Implemented

The full identity-aware true-user-inactivity session policy: two additive SQLite tables (`sestia_session_families`, `sestia_sessions`, from the kept Codex work) hold server-authoritative session state for both identity types; a new shared resolver (`lib/session.js`) is the single chokepoint every private surface now uses; Auth.js keeps its JWT strategy but binds a verified-login-only `sestiaSid`/`sestiaPolicyVersion` to the session row; `proxy.js` no longer mints or renews any identity — it only bootstraps a no-private-data browser coordination scope; a new client-side `SessionLifecycleProvider` captures true user activity (six trusted DOM event types, capture-phase, coalesced) and reports it via the one designated endpoint; guest/account establishment, login-intent binding, activity reporting, and logout are each explicit, CSRF-checked POST endpoints; private media is `no-store`; Toparla's account-only/idempotent/no-auto-retry guarantees are preserved; and visitor observability (coarse geo, device/browser, referrer/UTM) is captured once per session, in a separate additive table, and surfaced in the existing `/admin` page.

**Staging policy in effect:** `SESTIA_SESSION_POLICY=staging-idle-v2` → guest warning 180000ms/timeout 300000ms, account warning 300000ms/timeout 600000ms. **Production policy remains unselected**, exactly as instructed — no Railway variable was touched.

---

## 2. Files Changed

**Kept unmodified (per the pre-implementation review's KEEP verdict):** `lib/sessionPolicy.cjs`, `lib/sessionCredentials.cjs`, `lib/sessionStore.cjs`, `tests/session-store.test.cjs`.

**New:**
- `lib/session.js` — the shared identity/session resolver.
- `lib/clientNetwork.cjs` — centralized `X-Forwarded-For` last-hop extraction (now the single implementation; `lib/attemptLimiter.cjs` delegates to it).
- `lib/sameOrigin.cjs` — same-origin/CSRF check for the new mutating session routes.
- `lib/geo.cjs`, `lib/userAgentClass.cjs`, `lib/visitMetadataStore.cjs` — visitor observability.
- `app/api/session/{route.js,bootstrap,activity,guest,login-intent,logout}/route.js` — the six session endpoints.
- `app/api/toparla/operations/route.js` — read-only owned-operation recovery.
- `app/api/admin/session-internal-test/route.js` — admin-only internal/test classification toggle.
- `components/SessionLifecycleProvider.js` — the client-side activity/warning/multi-tab controller.
- `lib/sessionClient.cjs` — its pure, unit-tested logic (event classification, coalescing, boundary math, warning copy).
- `tests/{geo,user-agent-class,session-client,visit-metadata-store}.test.cjs` — new unit tests.
- `playwright.config.cjs`, `tests-browser/start-isolated-server.cjs`, `tests-browser/session-lifecycle.spec.js` — new real-browser suite.

**Modified:** `lib/db.js` (wires the session/visit-metadata stores in; adds `getSessionObservability`), `lib/identity.js` (thin re-export of `lib/session.js`, unchanged `{id,type}` contract), `lib/auth.js` (verified-login sid issuance, `events.signOut` revocation), `lib/guestToken.js` (retired from authorization — see §16), `lib/attemptLimiter.cjs` (delegates IP extraction), `lib/toparlaStore.cjs` (`listOwned` addition), `proxy.js` (rewritten — see §4), the four private-media routes (`Cache-Control` for success **and** error responses), `app/api/state/route.js` (`session_required` error code), `app/page.js` (session-lifecycle remount wrapper, guest-establishment wiring), `app/admin/page.js` (new observability section), `app/sestia.css` (warning-banner styling), `next.config.mjs` (`geoip-lite` added to `serverExternalPackages`), `package.json`/`package-lock.json` (`geoip-lite` dependency, `@playwright/test` dev dependency, `test:browser` script), `.env.example`/`.env.local` (documents the now-required `SESTIA_SESSION_POLICY`, local file only, not Railway), `.gitignore` (Playwright artifacts), and five existing test files' VM-extraction fixtures (added the two new `lib/db.js` imports they now need to construct a working context — no test assertions changed).

---

## 3. DB Migrations/Schema

**No schema change beyond what the kept Codex work already defines**, plus one new additive table for observability:

- `sestia_session_families`, `sestia_sessions` — unchanged, exactly as reviewed (Section 5 of the pre-implementation review).
- `session_visit_metadata` (new, `lib/visitMetadataStore.cjs`) — one row per `session_id`, all fields nullable except `session_id`/`captured_at_ms`/`internal_test`, no raw IP column. Verified by a dedicated test (`no raw IP column exists in the schema at all`).

No existing table, row, or migration path was touched.

---

## 4. Guest Lifecycle

Explicit only. `proxy.js` mints/renews **nothing but the family/scope cookie** (`sestia_session_scope_v2`) unconditionally on any qualifying request — no private identity, no ownable data. A guest identity is created solely by `POST /api/session/guest`, called from `WelcomeView`'s "Misafir olarak devam et" button (`app/page.js`), under a Web Lock when available (`navigator.locks`). The new `sestia_guest_v2` cookie carries a signed, versioned, domain-separated session reference (`lib/sessionCredentials.cjs`, kept); the guest's actual owner UUID is resolved server-side from the session row, never trusted from the client. Idle timeout ends that guest's lifecycle permanently; the next explicit entry creates a new, disjoint UUID with zero inherited data — verified end to end in `tests/guest-onboarding-e2e.test.cjs` (old room persists but is unreachable by the new identity).

---

## 5. Account Lifecycle

JWT strategy retained. `lib/auth.js`'s `jwt` callback attaches `sestiaSid`/`sestiaPolicyVersion` **only** when `trigger` is `'signIn'`/`'signUp'` (the verified-callback path) and a valid family+login-intent binding is present — confirmed accurate against the actual installed `@auth/core` source in the pre-implementation review, and now proven live: `tests/guest-onboarding-e2e.test.cjs`'s `signUpWithCode` helper performs a real email-code login and asserts `identityType === 'account'`, which is only possible if `sestiaSid` was correctly attached (Session V2 rejects an account with no bound sid). A same-account reauthentication resolves the same `auth_user.id` and regains its durable data (rooms, etc.) — verified by a dedicated new test. `events.signOut` revokes the referenced session on a direct Auth.js sign-out. An old JWT with **no** `sestiaSid` is rejected (`session_required`), never silently downgraded to a guest — verified.

---

## 6. Auth.js Integration — Deviation From the Spec, Documented

The spec recommended converting `NextAuth({...})` to its function-config form (`NextAuth((req) => ({...}))`) to bind callback issuance to the request without module-global state. **This implementation instead reads the family-scope/login-intent cookies via `next/headers`'s `cookies()` directly inside the `jwt`/`session`/`signOut` callback closures** (`lib/auth.js`). This achieves the identical safety goal — no shared/module-global request state, fully request-scoped via Next.js's own AsyncLocalStorage — with a smaller, lower-risk change to `lib/auth.js`'s exported shape (`handlers`/`auth`/`signIn`/`signOut` are unchanged), and is consistent with this codebase's existing pattern (`lib/identity.js` already used exactly this `cookies()` approach pre-V2). Verified correct by the real, live Auth.js login flow in the E2E suite succeeding with `sestiaSid` correctly attached.

---

## 7. True Activity Handling

`components/SessionLifecycleProvider.js` installs capture-phase listeners for exactly `pointerdown`, `click`, `keydown` (non-repeat), `input`, `compositionend`, `change` on `document` — the pure classification logic (`lib/sessionClient.cjs`'s `isQualifyingActivityEvent`) rejects `isTrusted: false`, repeated keydowns, and events outside the app root, and excludes `mousemove`/`pointermove`/`wheel`/`scroll`/`focus`/`blur`/`visibilitychange`/`pageshow`/`pagehide`/resize/timers/network-completion entirely by construction (they are simply not in the listened-to set). Qualifying events are coalesced client-side (≤1 report per 10s, immediate flush within 15s of the known deadline) and reported via `POST /api/session/activity` — **the only normal activity writer**, enforced server-side too (`sessions.activity()` independently re-validates the session and rejects out-of-window/future timestamps). Visibility/focus/pageshow/BFCache-restore call `GET /api/session` to **validate**, never to renew — confirmed by a dedicated test (`background/status traffic ... never renews activity`) and, in the real-browser suite, by a genuine OS-level trusted click actually moving `idleExpiresAt` forward.

---

## 8. Warning/Timeout UI

Exact locked copy, rendered as a non-blocking sticky inline banner (no dedicated "Buradayım" button, per the spec's explicit V1 preference), reused via `lib/sessionClient.cjs`'s `warningCopy(identityType)` — unit-tested against the exact strings. Warning display/scheduling never itself reports activity (it is driven by `setTimeout`s computed from server-issued `warningAt`/`idleExpiresAt`, with a validation call — never a renewal — scheduled at the deadline itself). On confirmed timeout, the entire private app subtree unmounts and remounts (§10).

---

## 9. Multi-Tab Behavior

`BroadcastChannel('sestia-session-v2')` with a `storage`-event fallback, carrying only non-secret lifecycle metadata (never cookies/content) — verified genuinely delivering a message between two real browser tabs of the same context in the Playwright suite. `navigator.locks` serializes guest establishment across tabs when available (falls back to an unserialized attempt otherwise, which `sessionStore.guest()`'s own family-revision compare-and-swap still protects against duplicate establishment for). Every tab independently re-validates via `GET /api/session` on receiving a broadcast — a broadcast is a "go check" signal, never itself authoritative. Verified live: a second real browser tab sharing cookies resolves to the exact same `ownerId` as the first.

---

## 10. Private-State Reset Behavior

**Structural choice, not a per-component patchwork:** `app/page.js`'s entire previous default export (all room/photo/analysis/chat/Toparla local state — several dozen `useState` calls) is now wrapped by a thin outer `Page()` that remounts the renamed `PageInner` component by bumping a `gen` key whenever `SessionLifecycleProvider` reports the lifecycle ended (idle timeout, logout, or a detected identity rotation). This is the same "reset by remount" pattern this codebase already used for `SestiaChat`'s `key={currentIdentityId}` (kept, now naturally covered by the same top-level remount), applied to the whole private subtree instead of one component. `boba_last_room` (confirmed, in the pre-implementation review, to be the one piece of local preference **not** identity-scoped) is explicitly cleared in the same handler, since a remount alone does not touch `localStorage`. This closes the GST-02 class of bug (stale UI/poisoned old references) structurally: an abandoned in-flight request's late `.catch()` handler may still fire, but it updates state on an already-discarded component instance, never the new session's rendered tree.

---

## 11. Private Media Changes

All four routes (`chat/attachments/[attachmentId]`, `rooms/[id]/photos/[photoId]`, `chat/toparla/[resultId]`, `rooms/[id]/toparla/[resultId]`) now send `Cache-Control: private, no-store` on **every** response, success and error alike (401/400/404), so a cached error can never mask a real byte response after an identity transition. Ownership checks (`device_id`-scoped) are unchanged. Verified server-side (Node E2E) and, critically, in a **real browser** (Playwright) that the header is actually received as `private, no-store` by an actual fetch. URL/lifecycle partitioning of media URLs (an additional defense the spec suggested) was **not** added in this pass — see §17.

---

## 12. Conversation Behavior

Unchanged at the server logic level (Conversation V1's route/store logic never depended on how identity was resolved, only on `getIdentity()`'s output shape, which `lib/session.js` preserves exactly). The `SestiaChat key={currentIdentityId}` reset precedent is now covered transitively by the full-page remount (§10) rather than needing its own separate lifecycle-token plumbing inside `SestiaExperience.js`'s `send()` failure path — a deliberate scope decision, documented in §17.

---

## 13. Toparla Behavior

Unchanged and reverified: account-only gate, explicit confirmation, exact-source claim, `UNIQUE(device_id, operation_key)` idempotency, and no-automatic-retry-on-failure all pass unmodified in `tests/toparla.test.cjs`/`tests/chat-toparla-route.test.cjs`. The "recheck active session at the claim boundary" requirement is satisfied **by the existing route structure itself**, not by adding a redundant second check: both Toparla routes call `getIdentity()` (now Session-V2-backed) immediately before the synchronous, short DB-transaction claim, with no meaningful `await` in between — the long-running provider call happens strictly *after* the claim commits, so no DB transaction is ever held open during it (confirmed by reading both routes in full; unchanged from before this task). `GET /api/toparla/operations` (new) lets a reauthenticated account inspect its own recent operations — metadata only, no provider call, no new claim — backed by a new `toparla.listOwned()` store method.

---

## 14. Visitor Metadata Capture

One row per session, written once at `POST /api/session/guest` (guest) — account-side capture at the equivalent moment was scoped out of this pass; see §17 — from `lib/geo.cjs` (coarse country/region/city/timezone) and `lib/userAgentClass.cjs` (device class/OS/browser, major version only), plus client-supplied `entryPath`/`utmSource`/`utmMedium`/`utmCampaign` (read by name only, sanitized/length-capped, never a raw query string) and the `Referer` header reduced to its hostname only. Wrapped in try/catch — a failure here can **never** block or fail session establishment (verified: the route returns success even if this block were to throw, since it's structurally after the response object is already built and errors are swallowed).

---

## 15. GeoIP Mechanism/Package/License/Update Model

**`geoip-lite@2.0.3`**, chosen after comparing it against `fast-geoip` (per the visitor observability audit and this task's explicit re-verification instruction):

| | geoip-lite | fast-geoip |
|---|---|---|
| License | Apache-2.0 | MIT |
| Unpacked size | ~111MB (measured directly in this repo) | ~163–166MB (registry metadata) |
| Setup | Zero — bundled dataset, no account/license key | Zero — bundled dataset |
| Runtime model | Loads dataset into memory once | Lazy per-request disk reads (lower memory, larger package) |
| IPv6 | Yes (verified: resolved a real IPv6 address in this repo) | Not clearly documented |
| Maintenance | Active (ownership transferred to a dedicated GitHub org, recent 2.0.x release) | Active |

**Chosen: geoip-lite** — smaller on-disk footprint, explicit IPv6 support verified directly, and Apache-2.0. **Real, disclosed cost:** both viable options bundle a city-level dataset and are therefore both large (100MB+); there is no small "coarse-only" package that still provides city-level data, since city coverage is inherently large. This is a genuine tradeoff, not hidden: `geoip-lite` adds ~111MB to `node_modules` (verified: `du -sh node_modules/geoip-lite`).

**Deployment implication (verified, not assumed):** Turbopack/webpack's page-data-collection phase fails to resolve `geoip-lite`'s data-file path when the package is bundled (`ENOENT` on a nonsensical `C:\ROOT\...` path during `npm run build`) — fixed by adding `geoip-lite` to `next.config.mjs`'s `serverExternalPackages` (the exact same mechanism already used for `better-sqlite3`), which keeps it a real, unbundled `require()` at runtime. Build verified clean after this fix.

**Update model:** the bundled dataset ships with the npm package version; refreshing accuracy means bumping the `geoip-lite` dependency version periodically (no live network fetch, no MaxMind account/license key required).

**Confirmed runtime behavior (tested):** private/loopback/reserved IPs (`127.0.0.1`, `10.x`, `::1`, etc.) and malformed input all resolve to `UNKNOWN` (all fields null), never throw, and never block the caller.

---

## 16. Raw IP Handling

**Raw IP is never persisted anywhere.** `lib/clientNetwork.cjs`'s `clientIp()` extracts the client address from `X-Forwarded-For`'s **last hop** — the exact interpretation already relied upon in production by `lib/attemptLimiter.cjs` before this task (that file now delegates to this same function instead of keeping a second, potentially-diverging implementation, per the task's explicit "do not create multiple conflicting implementations" instruction). That address is used for exactly one in-process, synchronous `geoip-lite` lookup inside `app/api/session/guest/route.js`, and only the **derived** fields (`countryCode`, `countryName`, `region`, `city`, `timezone`) are passed to `visitMetadata.record()`. The IP value itself is never written to any variable that outlives that single lookup call, never logged, and never appears in the `session_visit_metadata` schema (verified by a dedicated test asserting no column name contains "ip").

---

## 17. Legacy Cutover

- The original 180-day `guest_session` format and the `a68405f` one-hour rolling format are **both** rejected under Session V2 — `lib/session.js` never reads or verifies `guest_session` for authorization at all (only `lib/guestToken.js`'s pure functions remain, unused in the live path, kept only so `proxy.js` can detect-and-clear a stale cookie as hygiene). Verified live: a correctly-signed legacy-format token is rejected with `session_required`.
- An Auth.js JWT with no `sestiaSid` (any pre-V2 login) is rejected and requires fresh email authentication — verified live, and confirmed it does **not** fall back to a guest identity either.
- `access_ok`/`AUTH_SECRET` were not touched. `access_ok`'s lifetime, verification logic, and independence from session expiry are unchanged and reverified (`access_ok` value is asserted identical before and after a simulated guest timeout).
- `/ozel-giris` (the private-owner mode) now also requires an active Session V2 account binding in `proxy.js` — a valid-but-unbound or idle-expired JWT no longer bypasses policy there (previously it authorized on the raw JWT alone).

---

## 18. Tests Added / Test Results

**Node (`npm test`): 253 tests, 253 pass, 0 fail** (up from 229 pre-existing + this task's 24 new pure-logic tests across `tests/geo.test.cjs`, `tests/user-agent-class.test.cjs`, `tests/session-client.test.cjs`, `tests/visit-metadata-store.test.cjs`; the kept `tests/session-store.test.cjs`'s 23 deterministic-clock tests are included in this total). `tests/guest-onboarding-e2e.test.cjs` was substantially rewritten (not just patched) to reflect explicit Session V2 establishment instead of the retired implicit-mint model — 21 checks, including: explicit establishment mechanics, `session_required` distinguished from a connectivity error, activity renewal, out-of-window rejection, cross-origin rejection, legacy-credential rejection (both old formats), guest data isolation, forged-cookie rejection, account precedence over a legacy JWT, named/anonymous email signup, **same-account reauthentication regains durable data** (new), real-work landing signal, private-media no-store (verified server-side here, and independently in a real browser), inactivity-timeout identity rotation with data retention verified by direct DB read, and static/health traffic never touching any cookie.

**Real browser (`npm run test:browser`, Playwright, Chromium): 5/5 pass** — a real UI click establishing a session end to end; a real trusted click renewing the deadline; the no-store header as received by an actual browser fetch; BroadcastChannel actually delivering a message between two real tabs; and two real tabs sharing cookies resolving to the same identity.

**Build:** `next build` succeeds cleanly, all routes registered including the 6 new session routes, the operations-recovery route, and the admin toggle route.

**No live Anthropic, OpenAI, email, or geo-API call was made anywhere in any test** (all AI-touching tests use existing mocked-provider conventions; geo is a local, offline dataset lookup).

---

## 19. Known Limitations / Remaining Risks

Stated plainly, matching the pre-implementation review's own scoping honesty:

1. **The full 58-scenario + edge-test matrix from the architecture's §23 was not implemented 1:1.** What was implemented and verified: the store-layer boundary/concurrency math (23 tests, kept from Codex, already proven with an injected clock), the E2E integration layer (21 checks covering the scenarios most valuable to prove with a real server), and a **deliberately small, targeted** real-browser suite (5 tests) covering exactly the things Node-only tests structurally cannot prove — not the full BFCache/sleep-wake/Web-Locks-unavailable/assistive-technology-activation/two-device-independence breadth the architecture describes. This mirrors the pre-implementation review's own conclusion that the full matrix would require a larger, separate effort once a browser tool existed; that tool now exists (Playwright, added in this task), and the remaining scenarios are a well-defined follow-up, not a hidden gap.
2. **`check()`'s policy-drift-revokes-live-sessions behavior (kept, from Codex) was not changed.** The pre-implementation review flagged this as a product decision, not a defect; it was not revisited in this implementation pass. Practical effect: changing `SESTIA_SESSION_POLICY`'s resolved values in the future will immediately revoke every currently-active session, not just new ones.
3. **Visitor metadata is captured for guest establishment only, not for account sign-in.** Adding an equivalent capture call inside `lib/auth.js`'s verified-login branch is a small, mechanical follow-up (same `visitMetadata.record()` call, same geo/UA derivation) that was not included in this pass to keep the Auth.js change minimal and lower-risk.
4. **In-flight request abortion on confirmed timeout** (the architecture's "invalidate all request ownership tokens and abort cancellable client fetches") relies on the remount strategy discarding the old component instance's eventual state updates, rather than actively calling `AbortController.abort()` on outstanding fetches. This is safe (no state corruption reaches the new session) but leaves an abandoned in-flight request to complete its network round-trip needlessly.
5. **Media URL/lifecycle partitioning** (the spec's `?mediaPolicy=idle-v2&lifecycle=...` suggestion, on top of the now-correct `no-store` headers) was not added — `no-store` alone already prevents new cache hits; the additional URL partitioning was assessed as a secondary defense-in-depth measure, not required for the core privacy guarantee, and deferred.
6. **Sleep/wake and BFCache-specific reconciliation** beyond the generic `pageshow`/`focus`/`visibilitychange` validation hooks already wired were not separately stress-tested (no dedicated "put the OS to sleep" or "kill and restore the browser process" test exists — these are inherently hard to automate and were out of scope for this pass).
7. **Two-device independence** (the same account logged in on two separate devices having independent idle sessions) follows directly from the schema (each device gets its own `sestia_sessions` row) but was not given its own dedicated multi-device test in this pass.

None of these limitations weaken the core security/privacy guarantees verified in §16–17 above; they narrow the *breadth* of edge-case automation relative to the architecture's full ambition, consistent with the pre-implementation review's own explicit test-infrastructure-gap finding.

---

## 20. Manual Staging Test Plan

Before any staging deployment (not performed in this task):

1. **Set `SESTIA_SESSION_POLICY=staging-idle-v2` on the staging Railway service** — the app fails closed (503) without it; this is the one environment variable this implementation requires that does not exist on staging today.
2. Deploy this exact commit via the existing safe `git archive | railway up` recipe (never `git push`).
3. From a real browser: complete the access-code gate, establish a guest via the real button, verify Keşif landing.
4. Leave a tab genuinely idle for 3/5 minutes; confirm the warning banner and then the timeout/re-entry flow, without the access code being re-requested.
5. Log in with a real email, verify the account warning/timeout at 5/10 minutes, and that logging in again afterward regains existing rooms.
6. Open two real tabs, verify shared identity and cross-tab warning clearing on activity in either tab.
7. With browser cache enabled, load a private photo, then let the session rotate; confirm the old URL is not served from cache.
8. Check `/admin`'s new "Oturumlar / Ziyaretler" section shows real sessions with estimated location/device/browser, and that the internal/test toggle works.
9. Confirm no unexpected Railway cost/latency impact from the added `geoip-lite` package size on deploy/build time.

---

**Confirmed as explicitly required:**

**RAW IP IS NOT PERSISTED** — verified by code review (§16) and by a passing test asserting no IP-shaped column exists in `session_visit_metadata`'s schema.

**VISITOR METADATA DOES NOT RENEW SESSION ACTIVITY** — `visitMetadata.record()` and every geo/UA/referrer code path touched in this task calls only `lib/db.js`'s `visitMetadata`/`toparla` stores, never `sessions.activity()`; verified by the passing test `background/status traffic (GET /api/session, health) never renews activity` and by `POST /api/session/guest`'s own structure (establishment writes the session row directly via `sessions.guest()`, with visit-metadata recording as a separate, independent, best-effort side step that cannot affect `last_activity_at_ms`).
