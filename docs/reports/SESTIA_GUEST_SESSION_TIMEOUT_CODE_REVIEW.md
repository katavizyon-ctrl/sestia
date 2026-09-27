# SESTIA — Guest Session Timeout — Independent Code Review

Review date: 2026-09-27. Scope: staging manual-test readiness, not production approval.

## 1. Executive verdict

**NOT SAFE FOR STAGING YET**

The new-cookie happy path correctly implements a rolling hour and preserves the guest UUID. Access authorization and account sessions remain separate. Independent local tests and an isolated production build passed.

Nevertheless, existing 180-day cookies remain valid after extended inactivity; an already-open UI does not reliably transition when the server rotates its guest; and private image responses permit browser-cache reuse across that identity change. The second issue includes persistent failures for conversations containing old attachments, not just a harmless first-request error. These HIGH findings should be resolved before staging manual testing. No application, test, or configuration correction was made in this review.

No demonstrated remote cross-owner database read or account-session failure was found. Findings below distinguish confirmed code behavior, independent runtime observations, and browser behavior still requiring reproduction.

## 2. Reviewed repository state

- Base checkpoint: `9d49424f2e32326c698a50c2b732770fb5b7a702`.
- Current HEAD: `a68405f58412cef150e9a7203a5991ba154a8d51`, `fix: expire inactive guest sessions after one hour`.
- The implementation commit **exists**. It is not pending/uncommitted. Local inspection does not establish remote deployment status.
- Recent history places that commit immediately after the supplied base; earlier commits include Conversation V1, Toparla, and the real-work landing rule.
- Reviewed the complete tracked diff from the base, distinguishing HEAD changes from the unrelated working-tree deletion. Read both the 271-line audit and 123-line implementation report in full, then checked their claims against source.

Exact base-to-HEAD file set (643 insertions, 16 deletions):

| Category | File | Change |
|---|---|---|
| Implementation | `lib/guestToken.js` | One-hour mint lifetime; optional UUID reuse |
| Implementation | `proxy.js` | Unconditional renew-or-mint after existing gates |
| Tests | `tests/guest-token.test.cjs` | New seven-test suite |
| Tests | `tests/guest-onboarding-e2e.test.cjs` | Six added integration checks |
| Report | `docs/reports/SESTIA_GUEST_SESSION_TIMEOUT_AUDIT.md` | Prior audit |
| Report | `docs/reports/SESTIA_GUEST_SESSION_TIMEOUT_IMPLEMENTATION.md` | Implementation report |

Excluded, untouched pre-existing working-tree items:

- Deleted `design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png`.
- Untracked `toparla-benchmark-15.png`.

The only permanent review output is this file. Local test/build harnesses used disposable temporary fixtures/copies, as allowed for verification. No environment configuration files or persistent environment settings were changed; existing harnesses supply fake credentials to isolated child processes. No commit, push, merge, deployment, Railway action, email send, or live AI-provider call was performed.

## 3. Architecture assessment

`proxy.js:104-112` verifies the incoming guest cookie and signs another token expiring one hour from processing time. A verified ID is reused; a missing, malformed, invalid-signature, or expired token causes a random UUID. `lib/identity.js:19-35` independently checks account identity first and guest identity second.

This is a **rolling request-inactivity** design. It has no server-side last-activity record, revocation record, token version, or synchronization of concurrent renewals. Reading or typing without a qualifying network request does not renew it. A previously issued token remains usable until its own signed expiry, even if a newer token has been issued.

An independent, in-memory execution of the actual token source with a controlled clock confirmed:

- 10:00 creation, 10:40 renewal, 11:20 renewal preserve the same UUID.
- Exact timestamp equality is accepted; one millisecond after expiry is rejected.
- Two independent expired inputs mint different UUIDs.
- A correctly signed legacy token issued 24 hours earlier with the old 180-day lifetime is still accepted.

Thus the new-token mechanism is sound in sequential use, but the complete deployed lifecycle does not yet meet the requested rule for existing cookies or reliably present the new identity to an open client.

## 4. Findings table

| ID | Severity | Area | Evidence | Consequence | Recommended next action |
|---|---|---|---|---|---|
| GST-01 | HIGH | Legacy-token transition | `lib/guestToken.js:13,32-38,45-64`: only minting lifetime changed; verifier accepts any correctly signed future expiry. Controlled-clock reproduction accepted a 24-hour-idle legacy token. | Existing guests can resume old identity/data after far more than one hour, until their first renewal or original expiry. Replaying an older long-lived token remains possible. | Introduce a guest-only token/cookie version transition that rejects the old format, with migration tests. Do not rotate shared `AUTH_SECRET`, which would affect access/account layers. |
| GST-02 | HIGH | Expiry recovery / stale UI | `app/page.js:207-276`: onboarding comparison only under `isInitial`; `components/SestiaExperience.js:167-224` restores old messages on failure and retries their references; `app/api/sestia-chat/route.js:54-58` rejects every old attachment. | First action commonly fails; retry with historical images fails persistently. Old screens remain visible, and text-only history may be sent under a new guest without an explicit transition. | Add centralized identity-expiry recovery using the existing Welcome/Keşif flow. Preserve pending user input explicitly, invalidate old resource references/state, and resynchronize identity before further mutations. Add stale-tab browser coverage; no automatic paid retries. |
| GST-03 | HIGH | Privacy / browser cache (pre-existing) | Private attachment/photo/result GET routes set `private, max-age=31536000, immutable`: chat attachment line 30; room photo line 34; chat result line 35; room result line 30. URLs contain resource IDs, not an identity cache partition. | A same-browser successor identity can reuse previously cached private bytes without contacting the ownership-checking handler. `private` prevents shared-cache use; it does not separate users of one browser profile. Open DOM images also remain visible. | Use an appropriate non-reusable private-media cache policy, preferably `private, no-store`, and plan a URL/cache transition for already cached responses. Verify with browser cache enabled and clear old rendered state on identity change. |
| GST-04 | MEDIUM | Concurrent rotation / response ordering | `proxy.js:104-112` independently mints per invalid request; there is no common rotation result or response ordering protection. Independent token execution confirms divergent IDs. | Parallel expired requests produce competing cookies; a late response can replace the identity under which an intervening successful write occurred. Active renewals can also overwrite a newer expiry with an older one. | Add controlled concurrent-response tests and coordinate guest establishment/recovery before writes. Address response-order rollback or explicitly bound the accepted V1 behavior before production. |
| GST-05 | LOW | Boundary test determinism | `tests/guest-token.test.cjs:60-71` captures real `Date.now()` and immediately expects equality to survive another clock read. | A scheduler delay of one millisecond makes the exact-boundary test fail even when implementation is correct. | Inject/freeze the VM clock and assert exact equality and +1 ms deterministically. |
| GST-06 | NOTE | Activity classification | Proxy has no method/prefetch/background exclusion beyond path gates; `lib/telemetry.js` sends event/error requests; UI mounts state and media requests. | Automatic traffic can extend the window, although no recurring idle heartbeat was found in current application code. | Document request-based activity and test a truly idle production tab; tighten classification if product requires human interaction only. |
| GST-07 | NOTE | Retention | No expiry-triggered deletion exists; stores retain owner-scoped rows and private files. | Orphan data accumulates with repeated guest lifecycles. | Track storage and define retention separately later. Do not delete data as part of this timeout fix. |

No BLOCKER finding is asserted. HIGH findings are sufficient for the negative staging verdict. GST-03 predates this commit; it is relevant because the new requirement treats same-browser guest rotation as a privacy boundary.

## 5. Guest token review

Format: `UUID.expiryEpochMilliseconds.hexHmacSha256`, HMAC over the first two components using server-only `AUTH_SECRET`. Verification requires three components, a UUID-shaped ID, finite expiry, and matching 32-byte HMAC using `timingSafeEqual`. Missing/non-string values, ordinary malformed tokens, expired tokens, and tampered IDs/expiries/signatures fail closed.

UUID validation is syntactic, not restricted to version 4. Fresh IDs use `crypto.randomUUID()`. The optional `existingGuestId` parameter would accept any UUID-shaped string supplied by a trusted caller; it does not itself prove ownership. The only production caller is `proxy.js`, and its argument comes directly from `verifyGuestToken(req.cookies.get(...).value)`. No request body, query parameter, or localStorage value feeds it. Consequently no arbitrary-ID signing endpoint was found.

Expiry rejection uses `Date.now() > expires`, matching the requested “more than one hour” boundary. Cookie `Expires` has HTTP date precision, so real browser removal can precede the embedded millisecond boundary by less than a second. Missing `AUTH_SECRET` is an operational error, not a valid-token fallback.

The verifier does not validate lifetime or distinguish old/new versions (GST-01). Node's hex decoder also accepts some noncanonical suffixes after valid hex bytes; this can permit an alternative spelling of an already valid signature, but does not let an attacker change the signed payload or forge ownership. This behavior predates the change and is not a deployment blocker on its own.

Renewing an active verified token preserves its ID. It does not invalidate previously issued tokens. This matters for legacy replay and concurrent request ordering; a stateless signature alone is not a revocation mechanism.

## 6. Rolling inactivity review

**Requests that renew**

In normal access-code mode, anything reaching `proxy.js:104` after valid `access_ok`, regardless of method or eventual handler status:

- `/` page loads, reloads, and matching page/RSC/prefetch requests.
- `/api/state`, room list/detail/scan reads and writes, room creation and uploads.
- Chat upload, chat message requests, attachment byte GETs, photo GETs and Toparla result GETs that actually reach the network.
- Analyze, decide, inspiration, feedback, event and error APIs.
- `/api/account/precheck` and other non-excluded paths, including unknown paths that eventually 404.
- Failed application requests, including ownership failures and account-gated Toparla rejections, when they passed the proxy gates.
- Mount-triggered state/room requests, automatic image loads, screen/session telemetry, and error reporting. These are not all deliberate user actions.

**Requests that do not renew**

- Matcher-excluded path prefixes: `/_next/static`, `/_next/image`, `/favicon.ico`, `/manifest.json`, `/icon.svg`, `/sestia/`.
- Exact public paths: `/hosgeldin`, `/giris`, `/api/access`, `/admin-giris`, `/api/admin-access`, `/api/health`, `/giris-hatasi`. An authorized redirect from the welcome/login page to `/` can subsequently renew at `/`.
- `/api/auth/*`, including the mount-time `/api/auth/session` request.
- `/admin` and `/api/admin*` branches. The source does not blanket-exclude every `/admin/...` pathname.
- Requests rejected for missing/invalid access authorization.
- All traffic handled by the separate `privateOwner()` branch; guest sessions are not used there.
- Cache hits that cause no network request, and local typing/scrolling/reading without a resulting request.

Static assets are excluded by these particular path patterns, not by a universal extension rule. Unlisted public assets and other Next internal paths are not automatically exempt. There is no explicit prefetch exclusion.

Searches of `app`, `components`, and `lib` found no recurring `setInterval`, visibility/focus polling, service-worker heartbeat, or repeating timeout loop. The feedback timer only resets local UI. State is refreshed at mount or navigation, media on display, and telemetry on mount/view changes/errors. Therefore a healthy untouched production tab should eventually expire; no ordinary self-sustaining background renewal loop was found. Development hot reload/internal traffic is not evidence of production inactivity semantics. Browser network observation remains necessary to confirm idle behavior under deployment conditions.

## 7. Same-request propagation review

**Independent result:** rerunning the real isolated `next dev --webpack` integration harness produced the explicit INFO observation that the first `/api/rooms` request carrying an expired signed cookie returned **401**, while the response issued a new guest cookie. The next request can use that cookie. This was not inferred solely from the implementation report.

The installed Next.js 16.3.5 source explains a narrower result than the report's general claim. `node_modules/next/dist/server/async-storage/request-store.js:73-95,150-172` explicitly contains `mergeMiddlewareCookies`. It merges `x-middleware-set-cookie` from a plain `IncomingHttpHeaders` object, but its property check does not read values from a Web `Headers` instance. App Route handling calls `createRequestStoreForAPI(req, ...)` in `route-modules/app-route/module.js:565`.

A separate read-only execution of the installed request-store API with the same synthetic headers returned:

```text
Web Headers sees: old
IncomingHttpHeaders sees: new
```

Thus the observed API behavior is real for the tested stack; “Next.js never propagates response cookies” is too broad. Bundled proxy documentation distinguishes Cookie and Set-Cookie but does not by itself prove this runtime outcome. Production runtime behavior was not exercised by an HTTP server in this review; the production build was verified separately.

**Security:** the tested first request has no valid identity and exits before protected writes/provider calls. It cannot revive the expired guest. Browsers normally omit an expired cookie rather than sending it; absent identity also follows the mint-and-first-request-reject path here. The harness deliberately transmits expired values, which tests server rejection but is not a full browser-expiry simulation.

**UX:** no common 401-to-guest-onboarding handler exists. A first rejected mutation is generally safe from duplicate side effects, but clients display generic errors. A follow-up request succeeds only if its payload is valid for the new identity. Old image/room references remain invalid indefinitely, so “retry succeeds” is not generally correct.

## 8. Expiry/onboarding behavior

| Entry/action | Actual behavior from source and observed API semantics |
|---|---|
| Full refresh or new `/` navigation | Page response establishes a fresh guest. Mount-time state request normally sees it; `isInitial` comparison rejects old confirmation/name and shows existing WelcomeView, then Keşif for an empty guest. Access code remains valid. |
| Untouched open Keşif/Home | No timer clears it at one hour. Existing content remains displayed. A later request rotates identity. |
| Navigate to Home | `goTo('home')` starts state and rooms requests concurrently. First expiry responses can fail; a later successful state response updates identity and remounts the keyed global chat, but does not run onboarding because `isInitial` is false. |
| Open chat and press Send | Draft/file restored after generic failure. Current identity state is not refreshed by send. Old text remains; old image references make later sends fail. |
| Odalarım / Room Detail | Old room detail can remain visible. Reads/uploads first fail 401, then old resource IDs fail 404 under the new identity. Room errors are generic. |
| Direct/deep entry | Main product views are React state under `/`, not dedicated room/chat page routes. Auth/admin pages have separate gates; an invented `/rooms/...` page is not a supported recovery route. Direct API entry exhibits first-request behavior above. |
| New room mutation | First request may fail 401 and clear the creation key as a definitive 4xx. Explicit retry can create a room for the new guest while displayed identity remains stale. |
| Existing-room photo upload | File/operation retained for retry, but old room remains inaccessible; retry does not reconnect it. |
| Single decision save | First request may fail 401; retry records client-supplied decision under the new guest. `recordDecisions` silently drops a foreign room link instead of rejecting it (`lib/db.js:306-320`). Old row ownership is not changed, but the user can unknowingly save new data outside the displayed old room. |
| Room analysis / save / confirm | Ownership checks deny old room/session references. Recovery reads also fail; draft stays locally but there is no coherent session-expired transition. Stateless analyze can process client-retained bytes after new identity establishment, while persistence into the old room is denied. |

The existing `key={currentIdentityId}` on `SestiaChat` (`app/page.js:1441`) is useful: once a successful state refresh updates the ID, global chat resets. The problem is that upload/send/mutation errors never cause that refresh, and ordinary refreshes do not invoke the initial onboarding decision. This is more than choosing different error wording.

## 9. Access-code isolation

Confirmed unchanged: `lib/accessToken.cjs` signs access grants with 180-day lifetime; `app/api/access/route.js` sets `access_ok` with `maxAge: 60 * 60 * 24 * 180`. Production code verification and attempt limiting are unchanged. The guest branch writes only `guest_session`; the existing visit-cookie branch separately manages `sestia_visit`.

The integration check confirms unchanged `access_ok` value and a 200 page load after simulated guest expiry. Guest expiry alone does not require re-entering the access code. Both token types share `AUTH_SECRET`, which is why globally rotating that secret is not an acceptable isolated fix for GST-01.

## 10. Account isolation

`lib/auth.js:116` retains JWT sessions with `maxAge: 30 * 24 * 60 * 60`. `getIdentity()` resolves the allowed authenticated account first; an expired guest cannot override it. Existing private-owner/email restrictions are unchanged and intentionally do not fall back to a guest for a disallowed account.

Independent integration checks passed for account precedence and an account session alongside an expired guest. The latter uses an Auth.js-encoded session and a fixture account; other checks exercise the local email-code callback without sending email. These prove precedence, not long-duration account renewal in a real browser.

Normal account traffic still gets guest cookies refreshed at proxy level, as every qualifying request does. The newly increased frequency of Set-Cookie is real, although guest issuance alongside accounts predates this change. Protected handlers continue using the account ID. Account-only Toparla paths are unchanged.

## 11. Privacy / ownership review

Server-side paths reviewed:

| Data | Ownership enforcement and qualifications |
|---|---|
| Rooms | Routes derive identity on the server; `getRoomsForDevice`, `getRoomDetail`, `ownsRoom`, and creation operations bind owner. |
| Room photos | Upload store checks room owner before writing; byte lookup uses photo ID plus owner before filesystem access. URL room ID is not the byte lookup's ownership key; that does not expose another owner's photo. |
| Decisions | Inserts bind current identity; supplied room IDs are checked before linking. Room-detail subordinate queries rely on the already validated parent room. Foreign room IDs are dropped as described in section 8. |
| Room analysis/state/history | `roomDecisionStore` checks room/analysis owner before state operations; session-key lookups are followed by ownership checks. `saveRoomAnalysis` explicitly rejects a session key belonging to another room/owner (`lib/db.js:480-500`). UUID secrecy is not the sole protection. |
| Message state | Home/library selection queries use `(device_id, category)`. Visit token does not substitute for owner identity. |
| Inspiration | Route resolves identity; recent decisions and cache reads/writes are owner-scoped. |
| Chat attachments | `getOwned(id, deviceId)` precedes byte access in GET and conversation resolution; upload uses server-generated filenames/current identity. |
| Toparla | Claims/results use owner and operation key; result byte reads require owner and completed status. Generation additionally requires account identity. |
| Home aggregation | `/api/state` obtains owner-scoped user totals, work flag, message/library selections; account name query binds account ID. |
| Creation receipts | `(owner, kind, operation_key)` prevents cross-owner receipt replay. |

Not every SQL statement literally contains `device_id`: parent-authorized child queries and updates using already-owned rows are legitimate exceptions. The audit's “every single query filters” description overstates the source. No exploitable raw-ID database ownership bypass was found in these paths. Admin aggregate functions are deliberately global and protected by the separate admin page gate.

Two important limits prevent an unqualified privacy guarantee:

1. HTTP authorization only executes on network requests. The one-year immutable private-media cache policy permits local reuse after identity rotation (GST-03). No real-browser cache replay was run; this is a confirmed response-policy defect with browser verification still required, not a claim of observed remote leakage.
2. Conversation text is client-held, not an owner-scoped server conversation record. An old text transcript can remain visible and be re-submitted under a new identity; image references fail server ownership checks. Existing room/analysis state and unscoped `boba_last_room` local preference also survive until reset. Session expiry cannot retract downloaded bytes, but normal application behavior should stop reusing prior identity content.

## 12. Data-retention implications

No deletion, reassignment, migration, or cleanup was added by the timeout commit. Independent integration verification confirms an old room row persists under its old owner after rotation and is hidden from the new owner.

Repeated sessions can accumulate `users`, rooms, room photos, decisions, room scans/analyses and scan heads, creation-operation receipts, message state, inspiration cache, chat attachment rows, and event/feedback/error records. Private files accumulate in `data/room-photos` and `data/chat-attachments`. Toparla result rows/files (`data/toparla-results`) have retention needs too, but current guest sessions cannot create them because generation is account-only. General conversation text itself is not persisted by `/api/sestia-chat`.

Failed/lost chat uploads and retries can add further unattached files/rows because chat upload has no operation-key replay protocol. Retention is a future storage/privacy maintenance concern, not justification to delete on expiry and not a standalone staging blocker. No cleanup was designed or implemented.

## 13. Multi-tab / concurrency review

Sequential active tabs share cookies: renewal in tab A is used by tab B on its next network request, preserving identity. Each tab's React state is independent; neither receives a guest-expiry notification from the HttpOnly cookie.

Concurrent cases:

- Two active requests carry guest A and return A with different expiry timestamps. Arrival order can make the older expiry win, shortening the effective idle window by request processing/transport skew.
- Two expired/absent-cookie requests independently mint B and C. In the tested API stack both first requests reject before writes, so this alone does not mix database owners. The last Set-Cookie wins.
- Material interleaving: response B arrives; another request using B creates data; delayed response C overwrites the cookie. The B data then becomes unreachable to the browser even though the user was active. Cookie-write timing depends on response-header arrival, not just when proxy code executed.
- One request just before expiry can renew A while another still carrying the old token arrives just after expiry and mints B. Response ordering can choose either. No server-side “A is globally expired” record exists.
- Verification occurs both in proxy and `getIdentity()`. Contrary to the audit's atomic-boundary claim, a token can pass proxy and expire before route identity verification; that request may reject despite a renewed response cookie.

GST-04 is MEDIUM because it does not bypass server ownership and ordinary sequential usage works. It is not proven negligible for V1: concurrent Home state/room reads and media/telemetry requests are real sources of overlap. Existing tests do not schedule these races. Test and bound it before production; pending HIGH fixes should avoid introducing automatic retries that amplify it.

## 14. Conversation regression review

Within an active rolling hour, same ID means attachment ownership, text, image-only, image+text, context resolution and suggested-action validation retain existing behavior. Relevant mocked route/composer/provider suites passed.

For an expired open chat:

1. Send saves local draft/file variables, clears the composer, and attempts upload (if any), then message POST.
2. A 401 causes restoration of draft, file, preview and previous messages, with “Yanıt alınamadı. Mesajın burada; tekrar gönderebilirsin.” There is no automatic retry or identity refresh.
3. Text-only general chat may succeed on explicit retry using the new guest but the previous transcript. This is stale lifecycle continuity, not resumed server authorization.
4. If any previous user message references an old attachment, the route returns 404 for that reference on every retry. Adding a new image does not remove old references. Because upload precedes chat, each such explicit retry can upload another copy before the chat rejects.
5. “Yeni sohbet” clears global history; a full refresh also establishes onboarding. Neither is explained by the generic error. Room-context conversations additionally retain a now-foreign room reference until leaving that context.

Old protected media fails on a real server fetch but may still display from DOM/cache. The user action is generally restored rather than immediately lost; recovery/reload can still discard local work. This distinction is the basis for GST-02's severity. No live conversation or generation call was made.

## 15. Toparla regression review

Both `app/api/chat/toparla/route.js:42-46` and `app/api/rooms/[id]/toparla/route.js:34-40` reject absent identity (401) and guest identity (403) before claiming an operation or calling the provider. Account ID takes precedence, so guest expiry does not affect authenticated generation.

Exact-image targeting remains an explicit attachment/photo ID: server resolves ownership, validates suggested attachment membership, and store claims reject operation-key reuse for a different source. Claims are unique per owner and operation key before generation; completed results replay, pending operations return conflict, and failures do not auto-retry. Both UI entry points still require the explicit generation confirmation and explicit user retry.

All corresponding mock-provider tests passed. They do not prove expiry recovery or real provider behavior; they demonstrate that the unchanged account gates, ownership and idempotency behavior still hold. The private-result cache concern in GST-03 is pre-existing and also relevant to account switching, but no paid authorization regression was found.

## 16. Test-quality review

Independent `npm test` result: **206 Node test-runner results passed, 0 failed**, approximately 26.1 seconds. The output also contains **15 PASS integration checks**, including the six additions. The integration script is already matched by `tests/*.test.cjs` and is counted as a file-level result in that same run. Therefore “206 unit tests + 15 E2E” is imprecise if understood as 221 independent registered tests: the 206 includes the integration-file wrapper. The 15 checks are HTTP integration checks, not real browser/UI checks.

The initial sandbox attempt failed before tests could load (`EPERM` accessing `C:\projects`). The authorized rerun outside that restriction produced the successful results above; the initial environment failure is not an application regression.

What the tests establish:

- Actual token source is evaluated in a VM; fresh IDs, reuse, approximate one-hour minting, tampering, cross-secret rejection and normal expiry are tested.
- Real isolated Next dev server, real proxy/identity/store, known signed cookies, retained room rows, cross-owner room/attachment rejection, and account precedence are exercised.
- Existing Conversation/Toparla suites use real route/store logic with controlled identities and mocked providers; no live paid provider is required.
- Same-request test closely represents the current Route Handler architecture, and independently returned 401 here.

What they do not establish:

- Legacy 180-day token rejection; browser-local cached media isolation; stale-tab onboarding and conversation recovery; two-tab timing; cookie response reordering; a real hour of idle background traffic; production-server cookie propagation.
- The custom cookie jar ignores expiry, Secure, SameSite and browser cache semantics; it intentionally keeps transmitting expired cookies. That is valuable server testing, but not browser equivalence.
- Same-request assertion accepts either 401 or safe-empty 200. It proves no old room read in this fixture, not a fixed 401 contract or a successful second mutation/client retry.
- Token equality-boundary test uses real time and can flake (GST-05). Renewal test does not independently demonstrate successive clock advancement; the separate review clock experiment did.
- Account-expiry fixture creates an encoded Auth.js token directly; it is not a long-duration login/renewal browser test.
- Exclusion test checks health and favicon only, not every public/auth/admin/static/prefetch/background path.
- The new room-retention fixture proves that room persists; it does not prove every category of old data is inaccessible through browser storage.

The earlier audit's broader proposed scenarios were not all implemented. Green counts do not substitute for the missing lifecycle coverage.

## 17. Build/security verification

- **Passed:** existing `tests/build-isolated.cjs` built a disposable source copy with `next build --webpack` on Next.js 16.3.5, fake credentials, telemetry disabled and fetch blocked. Compilation/static generation completed; the harness confirmed real DB/WAL/SHM fingerprints unchanged. Temporary build output was cleaned by the harness.
- This independently verifies a production webpack build. It does **not** independently reproduce the implementation report's Turbopack claim or execute production HTTP requests. The displayed `22/22` is the static-generation progress count, not a count of all listed application routes.
- Source scan found credential access in server modules, no new `NEXT_PUBLIC` exposure, and no client import of the guest signing helper. The guest cookie remains HttpOnly, SameSite=Lax, Secure in production, Path=/.
- A read-only heuristic scan of the **existing** `.next/static` output examined 18 JS/map/JSON files and found no recognized long OpenAI/Anthropic key prefixes, explicit server-secret environment references, or the E2E signing secret. Its provenance was not tied to this review's disposable build, so this is limited evidence, not a comprehensive secret audit of a release artifact. No real secret values were printed or needed.
- Complete commit diff has no schema, dependency, environment, or account/access configuration change. Pre-existing additive store migrations are unrelated to this timeout commit.

## 18. Required fixes before staging

1. **GST-01:** reject legacy guest credentials through a guest-specific transition while preserving access/account credentials. Add an old-token migration/replay regression check.
2. **GST-02:** detect identity loss/rotation from an already-open client, reconcile server identity, route through the existing onboarding experience, and stop reusing old resource state. Preserve pending input with an explicit recovery choice; do not automatically replay mutations or paid requests. Cover text, prior-image chat, room upload and decision save.
3. **GST-03:** prevent normal cross-lifecycle reuse of cached private media, including a transition for existing cached URLs, and verify with browser cache enabled. Coordinate this with clearing stale rendered state.

GST-04 and GST-05 are not additional staging prerequisites by themselves, but concurrency should be included when verifying the required lifecycle recovery. No fix was applied here.

## 19. Manual staging test plan

Current verdict does not authorize proceeding yet. After the required fixes and local regressions pass, use this targeted plan:

1. Start with a pre-change guest cookie and old data; wait/simulate more than an hour idle, deploy the guest transition, and verify old identity is never resumed while access authorization survives.
2. Exercise 10:00/10:40/11:20-equivalent activity and compare identity IDs without exposing cookie secrets. Verify same guest and continued room/photo access.
3. Leave a production-mode tab untouched for over an hour with Network logging; verify no periodic application requests keep it alive. Separately test backgrounded and resumed tabs.
4. Return to an open chat and send text, image-only, image+text, then a message with an old image already in history. Confirm coherent recovery, retained pending input, no repeated generic-error loop, and no unintended provider retries. Use a controlled provider stub for this review scenario.
5. Repeat first-action expiry with new-room creation, old-room photo upload, single decision save, room analysis/resume/save/confirm. Verify no silent foreign-room detachment or duplicate writes.
6. Exercise Home, Keşif, Odalarım, Room Detail, refresh and back navigation; verify existing onboarding and new empty guest state, without access-code re-entry.
7. With browser cache enabled, load private images before expiry, rotate identity, and revisit the exact old image URLs. Check that old cached bytes are not reused by the application; test existing-cache transition too.
8. Use two tabs and delayed/reordered responses around expiry. Verify a late cookie cannot strand a successful new write or revive old client state.
9. Keep an authenticated account alongside an expired guest cookie. Verify account data and both Toparla gates/confirmation paths, with provider stubs unless a separate paid-call authorization is given.

## 20. Production risks still remaining

- Response-order and concurrent-rotation correctness (GST-04), including cross-tab recovery synchronization.
- Explicit product definition of meaningful activity versus all matching requests, prefetch, media loads and telemetry.
- Browser back/forward cache, memory/HTTP cache, restored tabs and locally retained drafts across identity transitions.
- Deployment-mode same-request propagation and any future Next.js runtime change; do not depend on the incidental first-request 401 as the only expiry signal.
- Guest data/file accumulation, storage limits and a separately defined retention policy.
- Deterministic boundary tests, actual browser expiry tests, and migration tests; scope secret scanning to the exact release artifact before production.
- Stateless token replay remains possible within each token's valid window; no per-session revocation exists.

The implementation is not declared production-ready. This review records the evidence and smallest necessary next corrections, without making them.
