# SESTIA — Identity-Aware True User Inactivity Session Policy

Architecture specification, final policy revision, 2026-09-27. READ-ONLY design; no implementation or deployment authorization is implied.

**FINAL STAGING POLICY**

- Guest / Anonymous / İsimsiz: warning **3m (180,000 ms)** / timeout **5m (300,000 ms)**.
- Authenticated email/account: warning **5m (300,000 ms)** / timeout **10m (600,000 ms)**.

This revision supersedes the earlier common 30-minute policy inside this same report. The historical filename is retained; this document is the single authoritative implementation specification.

Basis: `SESTIA_GUEST_SESSION_TIMEOUT_CODE_REVIEW.md` and independently inspected source at HEAD `a68405f58412cef150e9a7203a5991ba154a8d51`. The final identity-aware staging policy replaces the previous guest-only, one-hour requirement and the superseded common-duration proposal.

## 1. Executive recommendation

Recommend **one hybrid architecture: server-recorded idle sessions for both identity types, with a centralized browser lifecycle controller that reports only deliberate user interaction**.

- Store authoritative session status, owner, last accepted interaction time, policy version, identity-resolved warning/timeout durations and expiry in SQLite. Keep Auth.js email/JWT authentication, but bind each new account JWT to an active server session record. Guests use a new versioned session credential referencing the same session store.
- A browser controller tracks trusted interaction events, sends bounded interaction reports, shows a guest warning at 3m/account warning at 5m, and locks private UI at the guest 5m/account 10m deadline. Ordinary API traffic never updates activity. No unconditional keepalive exists.
- Coordinate tabs through BroadcastChannel (storage-event fallback), Web Locks for establishment/logout, and atomic server transitions. A tab's local timer never unconditionally signs everybody out.
- At confirmed guest expiry, end the old guest lifecycle and reuse guest onboarding; later explicit entry creates a new UUID with no inherited private data. At confirmed account expiry, end only the authenticated session/client-private state and reuse email login. **Persisted rooms, room photos, item photos, decisions, saved analyses, Toparla results and all other durable account-owned data survive unchanged and return after same-account verification.** Access-code authorization is unchanged.
- Introduce a guest/account credential-version transition, private-media `no-store` policy and fresh media URL namespace/version. Add two session/coordinator tables; do not migrate or delete private datasets.

The security guarantee is inactivity measured from **accepted client-reported human interaction**, not cryptographic proof that a human exists. Suppressing the JS timer or issuing background reads cannot bypass server expiry. A malicious client that deliberately fabricates interaction reports can keep its still-active session alive; this limitation is explicitly accepted for this non-banking V1 design. Expired/revoked sessions cannot be resurrected even by such a report.

## 2. Locked product policy

The server resolves these locked test/staging values from the authenticated session kind, never a client-selected identity type:

| Session kind | warning_after_ms | idle_timeout_ms | Warning / end |
|---|---|---|---|
| guest | 180000 | 300000 | 3m / 5m total inactivity |
| account | 300000 | 600000 | 5m / 10m total inactivity |

Let L = lastAcceptedUserActivityAt. Derive warningAt = L + warning_after_ms and idleExpiresAt = L + idle_timeout_ms. Warning is due exactly when serverNow >= warningAt AND serverNow < idleExpiresAt. At serverNow >= idleExpiresAt, including equality, the session is expired; expiry takes precedence over warning. Guest expiry is serverNow >= L + 300000; account expiry is serverNow >= L + 600000.

Use these deterministic boundaries everywhere. Neither warning state nor its display/dismissal/timer/status reconciliation extends the deadline. This is total inactivity since the latest accepted interaction, not an additional timeout that starts when the warning is displayed, a fixed session age, or time since the last HTTP request.

Exact rolling examples (mm:ss measured from the original last activity):

- Guest: activity 00:00 → warning 03:00 → genuine accepted interaction 04:00 → warning clears, next warning 07:00, timeout 09:00.
- Account: activity 00:00 → warning 05:00 → genuine accepted interaction 08:00 → warning clears, next warning 13:00, timeout 18:00.
- Activity received at or after the existing timeout cannot revive the session; explicit new establishment is required. A client event alone cannot authoritatively change either timestamp before server acceptance.

Lifecycle consequences:

- Guest expiry ends that guest lifecycle permanently. Explicit entry creates a new guest UUID; old data remains stored under its old owner.
- Account expiry ends an authentication session, not the account. Fresh email verification returns the same `auth_user.id` and its existing work.
- `access_ok` retains its existing 180-day behavior. A session timeout alone never requires the staging access code again.
- No background request, open tab, completed job, or downloaded image grants more time.
- After establishment, use the unchanged real-work landing rule: no work → Keşif; existing work → Ana Sayfa.

One session is shared by tabs in the same browser profile/site cookie scope. Different browsers/devices have separate sessions; activity on one device does not keep another device alive. This is session metadata, not an account-global lastActivity field.

## 3. Current architecture mismatch

Current source evidence:

| Location | Current behavior | Mismatch |
|---|---|---|
| `lib/guestToken.js:13,32-64` | One-hour signed expiry, no server record/version | Wrong duration; old 180-day tokens still accepted; no revocation |
| `proxy.js:104-112` | Re-signs/mints on every matching request | Telemetry/media/background calls count; simultaneous expired requests mint different guests |
| `lib/auth.js:105-153` | Auth.js JWT strategy, 30-day maxAge | Accounts have no authoritative identity-aware warning/idle enforcement |
| `lib/identity.js:17-35` | Valid account wins, else guest cookie | No shared idle policy; a rejected account must not silently fall through to a guest after the redesign |
| `app/page.js:192-276,1441` | Mount state request; onboarding check only when initial; chat keyed by owner ID | Open tabs do not detect expiry. Same-account re-login also needs a new lifecycle key, because owner ID stays unchanged |
| `components/SestiaExperience.js:167-224` | Generic send error restores previous history | Old attachment references poison subsequent sends |
| Private photo/attachment/result GET routes | One-year immutable browser caching | Private bytes can be reused without server reauthorization |

The actual application uses local state navigation and event handlers rather than URL routes for Home/Keşif/chat/rooms. Typing and choosing decisions often make no request. There is no existing BroadcastChannel, Web Locks coordinator, idle controller, or appropriate session table to reuse. `users.last_active_date` supports daily streaks, and `events` is telemetry; neither is an authoritative idle-session record.

The prior review's successful tests/build describe the existing implementation only. They do not validate this proposed architecture. No tests/builds were rerun for this document, because no code changed.

## 4. Definition of true user activity

Install one capture-level listener set on the active SESTIA application root, after session establishment. Use trusted browser events (`isTrusted`) and visible-document checks; do not collect key values, text, coordinates, filenames or image contents. Entry/login activity can establish a new session but never renew an expired old one.

**Count these events/actions:**

| Event/action | Exact rule |
|---|---|
| `pointerdown` | Trusted primary pointer press in the app root, including touch/pen. A deliberate tap/click counts; movement and hover do not. No pointer capture loop. |
| `click` | Trusted activation, including assistive-technology activation without a preceding pointerdown. Deduplicate with the same gesture's pointer/keyboard signal. Ignore scripted `.click()` as an activity source. |
| `keydown` | Trusted, non-repeat keydown inside the app. Include typing, Enter/Space activation, Tab navigation, arrows used in an app control. Exclude modifier-only keys and events whose target is outside the app. |
| `input`, `compositionend` | Trusted edits to enabled input/textarea/contenteditable controls. Includes mobile keyboards, paste and IME. Deduplicate overlapping key/input events; never inspect the entered content for activity tracking. |
| `change` on file inputs/selects | Trusted selection/change, including return from native photo picker. A selected file counts; picker focus return with no selection does not. Current hidden input `.click()` is not itself sufficient. |
| Explicit navigation/actions | Actual button/form activation: room creation, room photo selection/removal, chat send, decision selection/save, coverage/analysis confirmation, Toparla source selection/confirmation, before/after range interaction. Shared listeners normally cover them. Route custom controls through the same activity function when needed. |
| Browser back navigation | A visible `popstate` may initiate non-renewing session validation, but does not independently report activity: the app itself calls `history.back()`. Count only a deliberate in-app Back control's trusted activation. Do not pretend popstate proves human navigation. |

Visibility is the normal eligibility gate; do not require `document.hasFocus()` in a way that loses legitimate assistive/mobile/file-picker events. Reject interaction reporting while the lifecycle is locked/expired even when the user clicks the old surface. Check the deadline **before** treating the event as a renewal.

**Do not count:** `mousemove`, `pointermove`, hover, `wheel`, raw `scroll`, `focus`, `blur`, `visibilitychange`, `pageshow`, `pagehide`, resize, animation, media load/progress, timers, network responses, framework renders, telemetry/error dispatch, or generic fetch completion. Inertial/programmatic scrolling can continue without deliberate use; raw scroll/wheel is excluded in V1. A touch initiating scrolling may count once through pointerdown, and keyboard scrolling through a qualifying keydown. Passive reading or mouse-wheel-only scrolling through the guest 5m/account 10m idle window may time out: this is the deliberate, conservative V1 definition, not an unnoticed gap.

Focus/visibility/pageshow are **validation triggers**, never activity. Polling `/api/session` is not an activity report. An explicit analysis/upload starts with a real interaction, but its progress and completion do not keep the session alive. A rejected deliberate action can still count if the session was valid when its interaction report was accepted.

Coalesce event bursts. Update the local last-event timestamp immediately; send a leading activity report and at most one report per 10 seconds during continuous interaction, with a one-shot trailing report of the last actual event. No new event means no next report. Warning display, reconciliation, countdown render and dismissal generate no activity report. Near the known server deadline (within 15 seconds), or on genuine interaction while warning is visible, flush immediately before the user action proceeds. This is event-driven reporting, not a periodic heartbeat.

## 5. Architecture options considered

All three options require the same browser interaction classifier and timeout UI; none can remotely prove a human rather than a script.

| Dimension | A — Signed activity tokens for both types, no session DB | B — Auth.js database sessions plus separate guest session store | C — Shared idle-session records, retain Auth.js JWT authentication (recommended) |
|---|---|---|---|
| Human-inactivity fidelity | Good only if explicit interaction renews; still client-reported | Good with explicit activity; Auth.js automatic rolling updates must be bypassed | Good with one explicit activity writer; auth/framework reads never touch it |
| Guest support | Versioned signed guest tokens | Separate guest table/protocol | Same session table, guest subject |
| Account support | Add signed activity claim/companion token | Replace JWT strategy with adapter DB sessions | JWT carries new session ID and policy version; DB determines validity |
| Server authority | Signed expiry enforced, but logout/revocation and replay ordering weak | Strong record lookup/revocation | Strong record lookup/revocation |
| Multi-tab | Cookie expiry can move backwards; competing rotations | Shared server records; two systems to coordinate | Shared server records and lifecycle revision for both |
| Stale-tab recovery | Needs centralized client reset regardless | Needs centralized client reset | Same centralized reset, common error contract |
| Implementation complexity | Superficially small; difficult expiry races/revocation | High: adapter strategy migration and separate guest lifecycle | Moderate: one store, auth binding and controller; no provider-strategy replacement |
| DB/schema | None initially; adding revocation erodes simplicity | Auth session schema plus guest/coordination data | Two small additive tables in existing SQLite |
| Credential migration | Both signed formats must version; old JWT bypass risk | Force JWT re-login and guest migration | Force fresh policy credentials; no owner/data migration |
| Privacy | Requires no-store/state clearing; old tokens valid until expiry | Strong enforcement plus same client/cache work | Strong enforcement plus same client/cache work |
| Races | Stateless responses can overwrite newer credentials/deadlines | Requires transactional coordination between session systems | Atomic family/current-session transition plus monotonic activity |
| Testability | Easy token tests, hard distributed lifecycle assertions | Adapter and guest suites plus full-stack integration | Pure store/clock tests and shared lifecycle scenarios for both |
| Production configuration | Possible but credential versions must align | Possible across two mechanisms | Single server policy resolver and stored policy version |

Choose **C**. A does not adequately resolve GST-04 or authoritative account logout. B is viable but a larger Auth.js strategy change than necessary. Merely shortening Auth.js maxAge to the account idle duration is not sufficient: its session endpoint reissues JWTs on reads and would conflate network activity with human interaction.

## 6. Recommended architecture

### Server identity and credentials

Use `sestia_sessions` for active/ended sessions and `sestia_session_families` for one browser scope's current lifecycle/revision. A family is a coordination scope, not a person or private-data owner. Its signed HttpOnly cookie never suffices to read private data or to authenticate an account.

- Guest: new HttpOnly cookie `sestia_guest_v2`, containing a versioned random session ID and a domain-separated MAC. Session row supplies guest UUID. Never accept a client-supplied owner UUID.
- Account: existing Auth.js encrypted JWT gains server-generated `sestiaSid` and `sestiaPolicyVersion` only after successful email verification. JWT account subject must equal the session row's account subject. Session ID does not replace the account owner ID.
- Both: require the row to be active, the configured policy version to match, its family to point to that session/revision, and the server deadline not to have passed. Cookie/JWT expiry may terminate a session earlier; no cookie expiry can extend the DB idle deadline.
- Use a signed HttpOnly `sestia_session_scope_v2` cookie for the browser family. It is never the access code cookie. Keep its transport lifetime long enough for recovery; expired data access is denied by session records, not by waiting for this cookie to disappear. All new cookies: Secure in HTTPS deployments, SameSite=Lax, Path=/, no Domain.

### Shared authorization primitive

Introduce a typed session resolver underneath `getIdentity()` and Auth.js callbacks. Return active `{ownerId, identityType, sessionId, lifecycleRevision, warningAt, idleExpiresAt, policyVersion}` or a typed inactive result. Continue using **ownerId**, not sessionId, for `device_id` store queries.

Every private API, private-media read, relevant server-rendered account surface and owner-mode proxy gate must use it. No raw JWT-only shortcut, no guest fallback after an invalid account session, and no `getOrCreateSession()` inside ordinary authorization.

Protected application requests include a non-secret expected lifecycle identifier (for example `X-Sestia-Session`) to reject an old tab's mutation accidentally sent with a newly shared cookie. Media URLs include a non-secret session cache partition and policy version; neither is authorization. Header/URL mismatch returns a lifecycle error, never a write under the new owner.

### Endpoint contract

| Endpoint (proposed) | Purpose | Changes activity? |
|---|---|---|
| `POST /api/session/bootstrap` | Establish missing browser coordination scope under cross-tab lock, with no private identity/data | No |
| `GET /api/session` | Current lifecycle/status, server time, resolved warningAt/idleExpiresAt and policy version; private fields only if authorized | No |
| `POST /api/session/activity` | Validate existing active credential and explicit interaction report | Yes, only accepted reports |
| `POST /api/session/guest` | Explicit guest entry, transactionally establishes a new guest session | Initial activity only |
| `POST /api/session/login-intent` | Binds an explicit email login attempt to current family revision | No renewal of old session |
| `POST /api/session/logout` | Revoke the expected current session and cancel pending login intents | No |

Auth.js remains responsible for email verification and its CSRF flow. New POST routes require same-origin checks/CSRF protection and JSON content type as appropriate. Do not implement `/activity` as a GET, accept cross-origin beacons, or reuse analytics/event payloads as activity authority.

### Activity time and authoritative expiry

Server does not accept a client-supplied expiry, duration, owner or arbitrary future timestamp. Reports contain expected session/revision, event category, and the latest interaction time mapped to server time using the most recent server-time sample. The client derives elapsed time from a monotonic clock while awake; it revalidates after sleep/clock discontinuity.

The server bounds the timestamp to its current time, rejects implausible/future or excessively old reports, and atomically applies `lastActivity = max(lastActivity, acceptedEventTime)`. In the same update recompute idleExpiresAt using that session's stored idle_timeout_ms; derive warningAt from the same lastActivity plus stored warning_after_ms. Allow at most a short transport/coalescing age (15 seconds initially); reject out-of-window reports without extending time. Do not set lastActivity to the delayed trailing timer's send time. This avoids adding ten seconds of artificial idle life after the last event.

Crucially, transaction first checks `serverNow < existingIdleExpiry` and active/current status. An event that arrives after expiry cannot revive the session even if it claims to have occurred earlier. No offline event queue is replayed after expiry. A slow/offline network can therefore expire a session despite local human activity; that fail-closed limitation is preferable to accepting backdated resurrection. Normal clock/transport precision is bounded, not a claim of exact remote observation of physical keystrokes.

Only session creation after explicit entry and accepted activity reports write lastActivity. GETs, mutations, auth-session refresh, job completion, monitoring and media handlers do not. A user action wrapper flushes pending activity before protected mutation dispatch; that flush is safe/idempotent, but the mutation itself is never automatically replayed after expiry.

No cron is needed for enforcement: at the deadline the row is logically expired whether or not a cleanup job has marked it. Any authorization or status check rejects it; the client independently handles the visible boundary.

## 7. Guest lifecycle

1. With valid access authorization and no active policy session, render the existing guest/account entry experience with private state empty. Bootstrap may create only a coordination scope.
2. “Misafir olarak devam et” explicitly calls the guest-establishment endpoint under the shared transition lock. Generate guest UUID/session on the server, commit the family transition, set the versioned guest cookie, then verify status before loading owner data. Resolve/store guest warning_after_ms=180000 and idle_timeout_ms=300000.
3. Name/skip flags are written only against the newly established guest UUID; temporarily typed onboarding name is not stamped onto an old guest. Keep the existing name/method UI, adjusting when `chooseGuest` persists flags.
4. During use, accepted human activity extends the same session/UUID and recalculates both timestamps. At 3m idle show the warning; before 5m the session remains active. Background work and the warning do not renew it.
5. At exactly 5m total inactivity, deny the old credential permanently; hide/clear its context and return to guest entry. Do not mint a successor from a GET, telemetry, media request or the timeout event itself.
6. A later explicit guest choice creates a new UUID. Do not inherit rooms, photos, decisions, text history, attachment IDs, preferences tied to old identity, or operation keys.

Retain old rows/files. New guest normally has no work and lands on Keşif. A user choosing email instead authenticates an account; guest data is not automatically reassigned or merged.

## 8. Account lifecycle

### Installed Auth.js behavior

`lib/auth.js` uses JWT sessions, not adapter database sessions. `lib/authSchema.js` has user/account/verification-token tables but no configured auth session table. Installed `@auth/core/lib/actions/signout.js` decodes a JWT, emits a signOut event and clears cookies; it does not invalidate copies of that JWT. `actions/session.js` decodes, invokes `callbacks.jwt`, re-encodes and refreshes cookie expiry on session requests. Its database strategy is separate and is not currently selected.

Therefore client cookie deletion or Auth.js signOut alone is insufficient. An old 30-day JWT can still authenticate under the current code. The new server record is the authoritative veto, including when Auth.js reissues that JWT.

### Binding and reauthentication

Installed `actions/callback/index.js` invokes the JWT callback with verified `user` and `trigger: signIn/signUp` after email callback processing. Only that verified issuance branch may create a new account idle session and attach `sestiaSid`. A session read, `trigger: update`, client-submitted session data, or a legacy token lacking sid must never create a row or infer fresh activity.

Use request-scoped Auth.js configuration/wrapping (supported by installed `next-auth/lib/index.js`) to bind callback issuance to the browser family and login intent. Never keep request/family/user values in module globals. Avoid an auth↔identity recursion: a small session-store verifier used by JWT validation must not call `auth()` itself.

On normal JWT reads, reject missing/version-mismatched/expired/revoked session bindings before exposing account identity. `getIdentity()` independently uses the shared resolver. Protect `/api/auth/session` too, so it does not advertise an idle-expired account as active. Auth.js may retain its existing cryptographic maxAge as a transport ceiling; DB activity is never derived from its rolling `exp`/`iat`.

Account establishment resolves/stores warning_after_ms=300000 and idle_timeout_ms=600000. At 5m true inactivity show the warning; the account session remains active until exactly 10m. At 10m, only the authenticated session ends. **Do not delete/reset the account, rooms, room photos, item photos, decisions, saved analyses, Toparla results or other durable account-owned data; do not change ownership or create a guest dataset.**

Timeout leads to the existing email login flow, without silently creating a guest. Reuse WelcomeView with an actual reauthentication entry mode: current `emailOnly` still initializes at the name-intro stage, so it must enter the method/email stage directly and not require a new display name.

After successful verification of the same normalized email, the existing adapter's `handle-login.js` looks up `getUserByEmail` and returns the existing user ID. Create a **new session** for that same account, not a new user; preserve all `device_id = auth_user.id` data. The same account regains its persisted rooms, room/item photos, decisions, saved analyses, Toparla results and other durable work after verification. Different verified account means different data and no pending-state restoration.

Explicit logout revokes the expected server session first, broadcasts the transition, and clears Auth.js cookies through its supported CSRF-protected mechanism. Wire Auth.js `events.signOut` to revoke the referenced sid too, covering direct Auth.js signout. A stale logout request targets its old sid/revision and must never revoke a newly established session. Cookie cleanup is hygiene; record validation is security.

## 9. Access-code lifecycle

Keep `lib/accessToken.cjs`, the access grant lifetime and `/api/access` verification semantics unchanged. Do not derive session families or activity from `access_ok` and do not rotate shared `AUTH_SECRET` for migration.

Three distinct outcomes:

- Access invalid: `access_required` → existing `/hosgeldin`/code flow.
- Guest session expired: `session_expired` with guest entry mode → existing guest onboarding.
- Account session expired: `session_expired` with account entry mode → existing email reauthentication.

`proxy.js` can continue access gating and public/auth exclusions, but removes all automatic guest issuance/renewal. For normal `/`, serve a non-private entry shell when no session exists. Session status errors are not network errors and not access-code errors. Keep Auth.js verification routes reachable as required by the existing architecture.

Owner-only mode currently authorizes using `getToken` in proxy. That must also require the idle-session binding for private content; otherwise a valid old JWT bypasses policy on server-rendered pages. Its login/auth/status bootstrap exceptions need to remain reachable. Separate code-based `admin_ok` is an administrative authorization layer outside this new guest/email session policy; do not silently change its lifetime. An account-authenticated owner-mode page must not use it to bypass session checks.

## 10. Multi-tab synchronization

Use **BroadcastChannel plus storage-event fallback for notifications, Web Locks for credential transitions, and the shared server record for truth**. No persistent worker, WebSocket or constant polling is necessary for V1.

Messages contain only version, lifecycle ID/revision, activity revision, resolved warningAt/deadline, and transition reason; never cookies, names, transcripts, photos or other private payloads. Storage fallback stores one short-lived latest notification, not activity history. Local notification values do not grant access or change the server deadline.

- After an acknowledged activity update in A, broadcast the new warningAt and deadline. B clears any obsolete warning and reschedules both timers for the same lifecycle. Unacknowledged local activity can be announced as pending but cannot authoritatively extend B's session.
- At B's local warning threshold, perform a **non-renewing** status reconciliation before showing/resuming a warning; if A renewed, use the updated pair of timestamps and do not show the obsolete warning. A warning status request never changes activity. If reconciliation fails, preserve the known deadline, show only a provisional notice if appropriate, and fail closed at that deadline.
- At B's old deadline, B temporarily hides private content and performs a **non-renewing** status read. If A renewed, the shared record is active and B clears stale warning state and reschedules warning and expiry. B does not call signOut or unconditional revoke from its timer.
- On confirmed shared expiry/logout, every awake tab clears private state and enters the appropriate entry mode. Suspended tabs validate when resumed.
- Serialize bootstrap, explicit guest entry, login-intent creation and logout under one origin-level Web Lock. Activity writes need not hold a long-lived browser lock: server monotonic updates arbitrate them.
- After any credential-setting response, verify status/cookie lifecycle before showing data; broadcast establishment only after that check. Late responses/errors for another lifecycle are ignored by the UI.
- If BroadcastChannel is unavailable, storage notifications plus deadline/focus validation still work. If storage notifications fail, deadline/status validation prevents an idle tab from destroying an active session, although cross-tab visual logout may be delayed.

For staging V1, require Web Locks for automatic concurrent bootstrap/entry. Do not fake a reliable mutex using localStorage. If that capability is unavailable, fail closed to an explicit single-tab entry/reload instruction; do not auto-mint in parallel. Existing sessions still have server enforcement. This is a bounded browser-support constraint, to be verified in the target staging browser matrix, not a reason to weaken server checks.

## 11. Sleep/background/restore behavior

Schedule one-shot warning and timeout callbacks from server-confirmed warningAt and idleExpiresAt, both derived from the same accepted activity. Recompute elapsed wall-clock time on `visibilitychange` to visible, `focus`, `pageshow` (including `persisted`), and initial mount. These handlers validate, never report activity.

- Foreground idle tab: locally lock at the known deadline without waiting for the next product API. Query shared status to distinguish actual expiry from activity in another tab.
- Hidden tab: timers may be throttled. Hide/cover private UI when entering a suspended/hidden state and require validation before revealing on return. Do not rely on a trailing timeout firing in the background.
- Laptop sleep/wake after the applicable idle duration (guest >=5m, account >=10m): do not restart the timer from wake; lock and read server status before processing the first click/input. Unless another tab legitimately renewed, server denies the session.
- BFCache: use pagehide privacy cover and pageshow validation. Do not count the restore as activity. Remount private subtrees after confirmed identity/lifecycle validation.
- Browser killed/restored: default boot state is locked/unknown. Recover only from server status; cached React/localStorage state is not authentication. A session can survive a quick restart inside its valid idle window, but never receives extra time from restart itself.
- Clock changes: use server-time samples for deadlines plus monotonic elapsed time while awake; a wall/monotonic discontinuity forces validation. Never accept client clock rollback as proof of activity.

A suspended process cannot execute JavaScript at exactly the guest 5m/account 10m deadline, nor can code erase an OS screenshot. The server deadline remains effective while suspended, and the UI must validate before resuming use. This is the achievable open-tab guarantee; do not claim exact background timer scheduling.

## 12. Session-timeout UI transition

Central lifecycle states: `unknown/validating → active → validating-or-locked → timedOut/loggedOut → establishing → active`. Warning is a derived presentation substate of active, not a fresh session or another lifetime. Access denial is a separate state. Keep a monotonically changing client lifecycle token for in-flight work, not just `currentIdentityId`.

On a possible deadline, cover private content and disable actions while status is checked. Do not destroy drafts or broadcast final timeout solely from an outdated local deadline. On confirmed timeout:

1. Invalidate all request ownership tokens and abort cancellable client fetches.
2. Unmount the private app subtree keyed by **session lifecycle**, including same-account re-login. Remove room lists/details, photo elements, analysis/draft state, old chat messages/image refs, room/Toparla context, suggestions and confirmation widgets.
3. Revoke object URLs, release File/Blob references, clear private recovery snapshots and per-operation retry state according to section 13. Clear guest-specific local name/confirmation flags and `boba_last_room` rather than transferring them.
4. Broadcast the ended lifecycle. Ignore subsequent responses, including abort catch handlers that would otherwise restore old messages/files.
5. Render the existing guest entry or email entry component with a concise timeout notice. No new standalone screen is required. Account entry must not display an old account name/photo or switch silently to guest.
6. After explicit establishment, read fresh home state and apply the existing landing rule.

Use centralized response codes: `access_required`, `session_required`, `session_expired`, `session_revoked`, `session_replaced`, and `account_required` (the latter is still the Toparla guest gate). Scope errors to the requested lifecycle. A delayed old-session 401 must not sign out a new session; reconcile current status if ambiguous. A server/DB outage is a recoverable locked state, not permission to create a guest.

Warning is required in the existing app/session warning UI, not a new page. Guest at 3m: **“Hâlâ burada mısın?”** with **“Misafir oturumun 2 dakika içinde sona erecek.”** Account at 5m: **“Hâlâ burada mısın?”** with **“Oturumun 5 dakika içinde sona erecek. Kaydedilmiş verilerin korunacak; yeniden e-postanla giriş yapman gerekecek.”** If first displayed late after resume/reconciliation, explain the actual remaining time rather than incorrectly granting a fresh 2m/5m countdown. Render remaining time only as max(0, idleExpiresAt - estimatedServerNow).

Preferred interaction is a non-blocking inline notice: the user can continue using normal app controls, and a genuine accepted interaction clears the warning and moves both timestamps. Do not add a dedicated “Buradayım” button merely to support the architecture. If an existing warning control uses that button, its trusted explicit activation may pass through the normal activity reporter; it is not an automatic keepalive.

Warning display, timer callbacks, status GETs, countdown ticks and warning-only dismissal never renew. Exclude warning-only dismissal controls from the root pointer/click/keyboard activity classifier (including keyboard activation); a generic capture listener must not accidentally classify them as activity. Prefer no separate dismiss control in V1. If one exists, dismissal only hides the notice until a subsequent relevant reconciliation within the same warning interval, without altering warningAt or expiry; it never creates a new grace period. Genuine app actions outside such dismissal-only controls count normally while still valid.

No warning is shown as a substitute for expiry at the exact deadline. Clear warning state on lifecycle replacement; never reuse a guest warning policy for a subsequent account or vice versa.

## 13. Pending input policy

Choose a conservative V1 policy: preserve drafts during temporary validation/network errors, but **discard private unsent input on confirmed timeout/logout**. Do not introduce persistent draft storage in this task. Tell the user in the existing timeout notice that unsent input was cleared.

Current email-code completion uses `window.location.assign('/api/auth/callback/resend?...')` (`app/page.js:1703-1715`). An in-memory recovery buffer cannot reliably survive that full navigation. Persisting text/images in localStorage/IndexedDB merely to survive login would create another privacy boundary and cleanup mechanism. Do not promise recovery that this architecture cannot deliver.

| Input/work | At confirmed timeout | After entry/reauthentication |
|---|---|---|
| Unsent text / unsaved room name | Remove from visible UI and release draft memory | User retypes; no auto-restore or resend |
| Selected unsubmitted photo | Revoke preview URL; release File/Blob; clear input | User explicitly selects again; no cross-guest carryover |
| Upload in progress | Abort client wait; invalidate callback; server may already have stored it under original owner | No automatic re-upload. Account can inspect saved data; guest cannot recover old lifecycle data |
| Chat request in progress | Abort presentation and discard late reply/history restoration | Start a fresh conversation after entry |
| Room/decision save in progress | Never assume abort rolled back; hide state, do not resend | Same account reads durable room/decision state first; only an explicit new action can write |
| Analysis in progress | Do not start follow-on upload/save/provider steps after expiry | Saved account analyses may be read after login; unsaved response is discarded |
| Toparla confirmation open | Close it and clear frozen source/action | Reopen source and confirm explicitly if desired |
| Accepted Toparla generation | Server may finish existing operation for original account; no new provider attempt | Explicit read-only retrieval after same-account login; see section 16 |

For future draft recovery, same-account verification by stable user ID (not typed email) could allow a quarantined, explicitly restored text draft. That is technically possible but **not selected for V1**. Guest private references must never be restored into a new lifecycle. No mutation, message or paid generation is replayed automatically, including on reconnect.

Operation receipts already persisted server-side are not unsent input: recovering their committed outcome by an authorized read is safe. Do not use “retry POST to see what happened” as the default recovery mechanism for uncertain paid work.

## 14. Private media/cache policy

All success **and error** responses for chat attachments, room photos, chat Toparla results and room Toparla results use `Cache-Control: private, no-store`. Apply no-store to private JSON/session endpoints and authenticated private HTML where applicable. CDN/static serving must never bypass these handlers.

Every byte request still checks the active server session and owner before filesystem access. UI uses a new URL version, for example the existing route plus `?mediaPolicy=idle-v2&lifecycle=<non-secret-session-id>`. Validate lifecycle consistency on the server; query values are never credentials. Centralize URL construction so old URLs are not reconstructed from stale state after timeout.

Changing headers cannot retroactively erase responses cached under the old one-year immutable policy. New URL version prevents ordinary new-client cache hits on those URLs; it does not prevent someone manually retrieving old cached bytes. For this staging cutover, require testers to close old tabs and clear this site's cached files while preserving cookies/access authorization, or use a fresh test profile. A narrowly scoped `Clear-Site-Data: "cache"` may supplement that where supported; do not send `"cookies"` or blanket storage clearing that destroys `access_ok`.

Remove rendered private media and revoke object URLs on timeout. No-store does not retract downloaded files, screenshots, already decoded images, OS tab previews or maliciously copied bytes. The requirement is to stop normal application reuse and new unauthorized server reads, not impossible remote erasure.

## 15. Conversation behavior

While active, text/image-only/image+text and attachment ownership work as before. Activity comes from actual typing/select/send actions, not assistant responses or thumbnail loads.

On confirmed timeout reset the entire conversation instance: messages, draft, attachedFile/preview, room context, Toparla-result context, suggested actions, upload references and confirmation/result UI. Key it by session lifecycle, not just account ID. Late error handlers must not restore `previousMessages` after the controller invalidated that lifecycle.

After either new guest entry or same-account re-login, V1 starts a **new conversation**. Same-account room/result context can be reopened explicitly from freshly authorized data; it is not carried over automatically. Old attachment history therefore cannot poison new sends. Keep general transcripts client-only; no server transcript persistence is needed.

The server continues validating every image/context owner on every conversation request. These checks complement session expiry and must not be removed because the client now resets itself.

## 16. Toparla behavior

Preserve account-only server gates, explicit UI confirmation, exact source IDs, per-owner operation-key idempotency and no automatic paid retries.

Define the acceptance boundary: in a short DB transaction, verify the current session is active and atomically claim the Toparla operation for the authenticated account. Recheck at this claim boundary if upload parsing/other awaited work happened after initial authorization. Do not hold a DB transaction open during provider calls.

An operation accepted before expiry may complete after expiry and persist its result for that same account. It does not renew the session. Timeout is not cancellation/refund of an already accepted external job. No new operation/provider retry is accepted under the expired sid, and no guest can generate.

After same-account reauthentication, read the accepted operation/result with a new active session. Add a read-only owned-operation status/list endpoint (section 22) so recovery does not require a POST. Completed result → authorized no-store bytes; pending → status only; failed → show error, with a new attempt requiring fresh explicit confirmation. Different account and new guest receive no result.

Current store already persists `device_id`, operation key, pending/completed/failed state and source IDs. It has result-by-ID/file methods but no suitable public read-only operation recovery API. Add that narrow read path; do not assume it already exists. V1 need not add a background worker or promise crash recovery: a process crash can leave a pending operation requiring diagnosis, never automatic paid resubmission.

## 17. Legacy credential migration

Treat the staging deployment as a new session-policy epoch. Set the new server policy version to `2`; include/bind it in every new credential and record.

| Existing credential | Required behavior at staging cutover |
|---|---|
| Original 180-day `guest_session` | Never authorize or import its UUID into a new session. Ignore/reject it; expire the cookie as hygiene during controlled entry |
| `a68405f` one-hour `guest_session` | Same rejection: it proves the obsolete format, not the new activity policy |
| Existing account JWT without valid v2 sid binding | Requires fresh email authentication. Never synthesize a new server session on token read, mount, precheck or activity POST |
| New v2 account JWT pointing to ended/missing/old-policy row | Reject even if Auth.js signature and 30-day expiry are still valid |
| `access_ok` | Continue verifying unchanged; retain its existing value/lifetime |

Both guest token generations share a format, so there is no safe way to infer recent human activity from them. Reject both rather than estimating issue time. Do not rotate `AUTH_SECRET`. Domain-separate new guest/coordinator MAC payloads so old guest/access tokens cannot be interpreted as the new credentials.

Account data is not migrated. An existing account login callback resolves its original ID. Old Auth.js cookie chunks must be cleared through supported cookie handling, but DB enforcement must work even if a captured legacy JWT is manually replayed.

Deploy server and client changes together. Old loaded JavaScript cannot be remotely taught the new timeout UI; at staging cutover instruct testers to close/refresh old tabs and handle cached media as section 14 describes. Server rejects obsolete credentials regardless of whether they refreshed. Do not roll back to a binary that accepts legacy credentials after announcing the new policy.

## 18. Data/schema impact

Recommend **two additive SQLite tables**, initialized transactionally using the repository's existing migration/locking pattern. No change to existing private-data owners or Auth.js user/account/verification-token schemas is necessary.

Proposed exact fields (integer timestamps are server epoch milliseconds):

**`sestia_session_families`**

| Column | Constraint/purpose |
|---|---|
| `id TEXT PRIMARY KEY` | Random browser coordination ID, authenticated by its HttpOnly scope cookie |
| `revision INTEGER NOT NULL DEFAULT 0` | Monotonic lifecycle transition counter |
| `current_session_id TEXT NULL` | Current session pointer; updated atomically with revision |
| `created_at_ms INTEGER NOT NULL` | Creation time |
| `last_transition_at_ms INTEGER NOT NULL` | Transition time, not user activity |
| `login_intent_hash TEXT NULL` | Current explicit login intent, never raw email code |
| `login_intent_expires_at_ms INTEGER NULL` | Bounded by email-login flow validity |
| `login_intent_revision INTEGER NULL` | Expected family revision for successful callback |

**`sestia_sessions`**

| Column | Constraint/purpose |
|---|---|
| `id TEXT PRIMARY KEY` | Cryptographically random session identifier |
| `family_id TEXT NOT NULL` | References coordination scope |
| `family_revision INTEGER NOT NULL` | Revision when established |
| `kind TEXT NOT NULL` | CHECK guest/account |
| `subject_id TEXT NOT NULL` | Guest UUID or existing account ID; actual data owner |
| `policy_version INTEGER NOT NULL` | New policy epoch |
| `idle_timeout_ms INTEGER NOT NULL` | Server-resolved immutable per-session snapshot: guest 300000, account 600000 in staging |
| `warning_after_ms INTEGER NOT NULL` | Server-resolved immutable per-session snapshot: guest 180000, account 300000 in staging |
| `created_at_ms INTEGER NOT NULL` | Establishment time |
| `last_activity_at_ms INTEGER NOT NULL` | Latest accepted interaction time |
| `idle_expires_at_ms INTEGER NOT NULL` | Maintained atomically as last_activity + idle_timeout_ms |
| `activity_revision INTEGER NOT NULL DEFAULT 0` | Monotonic accepted update version |
| `ended_at_ms INTEGER NULL` | Revocation/expiry/replacement tombstone |
| `end_reason TEXT NULL` | idle/logout/replaced/policy, constrained values |
| `creation_key_hash TEXT NOT NULL` | Idempotency identifier for explicit establishment |

Constraints/indexes: unique `(family_id, family_revision)`, unique `(family_id, creation_key_hash)`, index `(kind, subject_id)` for controlled account-session queries, and index on `idle_expires_at_ms` for eventual maintenance. Enforce `0 < warning_after_ms < idle_timeout_ms`, correct named-policy/kind values at issuance, expiry relation and ended-state consistency in the store and appropriate CHECK constraints. Keep family pointer consistency inside an immediate transaction; a circular foreign key is unnecessary.

Choose **A: store warning_after_ms on each session**, alongside idle_timeout_ms. This keeps warning/expiry thresholds tied to the same immutable server-issued policy snapshot even during configuration changes and makes status reconstruction and deterministic tests straightforward. Derive warningAt = last_activity_at_ms + warning_after_ms on every response; do not persist a separate mutable warning countdown, warning-dismissed flag or warningAt column. Policy changes require an explicit version/transition rather than silently changing existing rows. No third policy table is needed.

No plaintext credentials, event logs, transcripts, pointer coordinates, keystrokes or photo bytes are stored in these tables. Store HMAC-authenticated guest token IDs, not client-selected owner IDs. Account sid itself is not a credential without the signed/encrypted JWT and family binding. Do not add `lastActivity` to the account globally.

Retain session tombstones initially to prevent ambiguous replay. Define later bounded session-metadata retention independently from private-data retention; never delete rooms/files when ending a session. Current single SQLite deployment is suitable; multiple independent replicas would require a shared authoritative store before this design could be considered correct.

## 19. Environment/staging configuration

Choose **C: policy-configurable**, with the server resolving a named deployment policy. Proposed server-only selector: `SESTIA_SESSION_POLICY=staging-idle-v2`. That policy (version 2, not yet implemented) resolves by server-verified identity kind:

| Kind | Warning after | Timeout after |
|---|---|---|
| guest | 180,000 ms (3m) | 300,000 ms (5m) |
| account | 300,000 ms (5m) | 600,000 ms (10m) |

The earlier common-duration mapping was only a proposal and is superseded before implementation. Session creation copies the two resolved durations into its immutable snapshot. A guest-to-account or account-to-explicit-new-guest transition creates a new lifecycle with the correct new snapshot; an activity report cannot change kind or either duration. This report does not set that variable anywhere.

Do not use `NODE_ENV === production` to distinguish staging: Railway staging normally runs a production build too. Do not expose client override parameters for timeout. `/api/session` exposes only the current lifecycle's resolved warningAt, idleExpiresAt, serverNow, identity kind and policy version needed for scheduling/reconciliation, together with otherwise necessary authorized lifecycle metadata. Activity acknowledgements return the updated timestamps. Do not let the client select a policy or supply effective warning/timeout values; the server rejects attempted overrides.

Unit tests inject a clock/policy directly; browser integration uses an explicitly test-only server fixture configuration. No production HTTP endpoint can shorten/advance time or choose a policy.

Production policy is **unselected**; neither staging duration nor any earlier proposed duration is a production default. Production deployment of this feature remains gated until a named production policy is approved. Missing/unknown policy on a deployment intended to enforce v2 should fail startup/health validation rather than downgrade to legacy authorization. This does not block implementing and testing the staging architecture.

## 20. Security model

Achievable guarantees:

- Disabling browser timers, replaying media/state/telemetry requests, or refreshing Auth.js sessions does not move server lastActivity.
- Every protected request checks server status; captured expired/revoked/legacy credentials cannot read private data or renew themselves.
- Client cannot choose an owner, timeout, expiry or newer policy. Report processing is atomic, monotonic and bounded; old reports do not revive a session.
- Activity and transition POSTs use same-origin/CSRF defenses, credential binding and rate limiting. Browser “trusted event” filtering prevents accidental synthetic app events from renewing sessions.

Not achievable without disproportionate friction: distinguishing a real person from an authenticated malicious script that continuously submits plausible fresh activity reports. `isTrusted` cannot be attested to the server. Signing the timestamp alone does not solve that. CAPTCHA per interaction, biometrics, or browser attestation are not recommended for this app.

The risk model is unattended shared-browser exposure and accidental immortal sessions, with server-enforced idle/revocation after reports stop. A deliberately active attacker with stolen still-valid session credentials is outside what an idle timeout alone can prevent. CSRF controls reduce third-party keepalive; XSS/same-origin compromise defeats client interaction claims and must be addressed separately.

Transport timestamps have bounded skew/latency, and offline edits may be lost on fail-closed expiry. No timer can remove already copied content. No claim of absolute human-presence proof or remote cache erasure is made.

## 21. Concurrency/race analysis

### Activity versus expiry

Run activity update and current-session check in one transaction. Activity succeeds only if the row/family/policy is still current and serverNow is before existing expiry; update via max and increment activity revision. An expiry check never overwrites a later successful activity update based on a stale client deadline. If expiry wins first, later reports fail; no resurrection grace period.

### Controlled guest creation

Only explicit guest entry creates a guest. Require family cookie, expected family revision, CSRF, and a fresh per-transition idempotency key. Under a Web Lock, tabs share a single pending transition and first check current status. In SQLite, compare-and-swap the family revision, create one session, and point the family to it atomically.

Same key retry returns the same current establishment, not another UUID. Different key/old revision loses with `session_replaced`/conflict and must reconcile; it cannot create a second current guest. Reissuing a guest cookie for a lost response is permitted only for the same bounded creation intent, same family, and still-current active row. A stale key must never reissue a credential after that session ends. Treat the short-lived recovery key as sensitive coordination data, never broadcast credentials or persist it indefinitely.

A family cookie alone cannot request the current guest's credential or private data. Losing tabs wait for the winning cookie response then validate. Initial missing-family bootstrap is also serialized before private work is possible; without Web Locks use the explicit unsupported-concurrent-entry behavior from section 10. No arbitrary API response mints a guest.

### Account transitions and logout

Bind login-intent creation to a family revision, invalidate prior intent on logout/replacement, and consume it once only after successful email verification. A delayed callback from an old intent cannot reactivate an ended lifecycle. Use request-local context, never global callback state.

The normal current flow is same-browser six-digit email verification. For an email link opened in a truly new browser scope, verified one-time email proof can establish a new family/session for that device. For an existing scope with an obsolete/mismatched intent, fail to the existing login flow rather than overriding a newer login/logout. This must be tested with the installed provider callback, including verification-token consumption and error handling; do not substitute a JWT-session refresh for fresh verification.

Multiple browser tabs submitting different login/guest transitions are arbitrated by the family revision, not response arrival. Explicit logout revokes its expected sid/revision; a delayed old logout cannot revoke the successor. Prefer targeted cookie cleanup after checking current state, but **HTTP cannot undo an already emitted late Set-Cookie**. A delayed Auth.js refresh/cleanup may overwrite/remove a newer cookie and cause a recoverable login error. Server family binding prevents that stale credential from restoring access. The design substantially reduces races; it does not promise that Web Locks can order arbitrary network responses across crashed processes.

### In-flight work

Every UI request captures lifecycle ID. No old response updates the new lifecycle. A mutation accidentally dispatched by a stale tab with shared new cookies is rejected by expected-lifecycle mismatch. Revalidate immediately before durable mutation/provider acceptance after long body reads. Once accepted, completion can persist for the original owner without extending the session (especially Toparla); never rebind completion to whoever is currently logged in.

## 22. Exact implementation plan

Implement later in a **new superseding commit**; do not rewrite/revert `a68405f` in this audit. Its request-renewal block will be replaced deliberately, not merely patched to a shorter duration. Preserve its reports as historical evidence.

Expected source work:

| Files/modules | Planned change |
|---|---|
| New `lib/sessionPolicy.cjs` | Identity-aware named server policy, warning/timeout snapshots, version and injectable clock contract |
| New `lib/sessionStore.cjs` | Two-table schema/migrations, monotonic activity, transactions, revoke/establish/status and family arbitration |
| New `lib/sessionCredentials.cjs` | Domain-separated guest/scope cookie encoding and verification |
| New `lib/session.js` | Server resolver, typed errors, expected-lifecycle checks; no implicit creation |
| `lib/db.js` | Initialize/export the session store using existing DB and migration discipline |
| `lib/identity.js` | Delegate to active session resolution while preserving owner-scoped identity and account-only helper |
| `lib/auth.js` | Verified-login sid issuance, read validation, signout revocation, request-scoped intent handling; preserve account IDs/provider |
| `app/api/auth/[...nextauth]/route.js` | Wrap/configure Auth.js request context and login callback/cleanup integration as required by installed API |
| `proxy.js` | Remove automatic guest mint/renew; keep access authorization; validate owner-mode idle binding, allow entry/status/auth paths |
| `lib/guestToken.js` | Retire from authorization. Remove obsolete helper or keep only an explicitly non-authorizing legacy detector; never fallback to it |
| New `app/api/session/route.js` | Non-renewing lifecycle/status GET |
| New `app/api/session/{bootstrap,activity,guest,login-intent,logout}/route.js` | Explicit session protocol; no private data from bootstrap |
| New `lib/sessionClient.cjs` | Pure controller/event-coalescing/warning/deadline/race logic, transport-independent for tests |
| New `components/SessionLifecycleProvider.js` | Browser listeners, warning reconciliation/dismissal exclusion, private-state gate, broadcasts/Web Locks, shared context |
| New `lib/sessionFetch.js` | Typed response handling, expected lifecycle headers, cancellation ownership; no mutation auto-retry |
| New `lib/privateMedia.js` | Central versioned/lifecycle-partitioned private URL construction |
| `app/page.js` | Central lifecycle transitions; key entire private subtree by session; adapt WelcomeView/chooseGuest/emailOnly/landing integration and all request ownership |
| `components/SestiaExperience.js` | Activity integration, lifecycle-safe abort/error restoration, media URLs, reset conversation/Toparla UI |
| `lib/client.js`, `lib/roomScanClient.cjs`, `lib/telemetry.js` | Scoped preference clearing, typed session transport, explicitly non-renewing telemetry; no catch-to-guest fallback |
| `components/FeedbackButton.js`, `components/GlobalErrorReporter.js` | Non-renewing reporting; no error-report keepalive loop |
| `app/layout.js`, `app/sestia.css` | Lifecycle gate integration and privacy cover/notice styling if needed |
| `app/ozel-giris/page.js`, `app/admin/page.js` | Owner-mode reentry/server authorization integration where account-based access is used; retain separate admin-code semantics |

Apply active-session/typed-error and commit-boundary checks to existing protected APIs: `state`, `rooms`, `rooms/[id]`, `rooms/[id]/scan`, `rooms/[id]/photos`, `decide`, `analyze`, `inspiration`, `sestia-chat`, `chat/attachments`, `chat/toparla`, `rooms/[id]/toparla`, `event`, `feedback`, `error`. Error reporting may remain anonymous but never extends activity or exposes private data. Evaluate `account/precheck` as login preparation, not an authenticated-session renewal.

Update these four existing private byte routes for authorization, URL lifecycle policy and no-store:

- `app/api/chat/attachments/[attachmentId]/route.js`
- `app/api/rooms/[id]/photos/[photoId]/route.js`
- `app/api/chat/toparla/[resultId]/route.js`
- `app/api/rooms/[id]/toparla/[resultId]/route.js`

Add `app/api/toparla/operations/route.js` GET with an optional operation-key filter and bounded recent-owned-operation list; add owner-scoped read methods in `lib/toparlaStore.cjs`. It returns metadata only under a fresh active account, never calls a provider and never claims a new operation. Integrate an explicit result-recovery action in existing account/Toparla UI. Existing creation/decision receipts can be read via their normal owned state paths; no new transcript/draft store.

Keep access-token implementation and existing owner predicates unchanged. `lib/authSchema.js` need not gain an Auth.js sessions table because JWT strategy is retained. Document policy setup in deployment documentation later; do not change Railway or production defaults as part of architecture approval.

Tests to add: `tests/session-store.test.cjs`, `session-policy.test.cjs`, `session-client.test.cjs`, `session-routes.test.cjs`, `session-auth.test.cjs`, `session-browser-lifecycle.cjs` and its browser fixture. Extend guest onboarding/browser, private access, room-client, conversation, attachment and Toparla suites. Old guest-token cryptography cases remain useful for migration rejection, but their one-hour/rolling-request acceptance assertions must be replaced, not retained as target behavior. Use deterministic clocks (fix GST-05).

## 23. Exact test plan

Write tests before implementation. Store/unit tests use injected time and isolated SQLite; route/auth integration uses real installed Next/Auth.js with fake signing secrets and local verification-token fixtures. Browser tests run a real cache-enabled browser with controllable test-only clock/server fixtures. AI/email providers are stubs; assert call counts. No live Anthropic/OpenAI/email calls.

| # | Required test and assertion |
|---|---|
| 1 | Guest before 180000 ms idle: active, no warning; normal accepted interaction preserves sid/UUID. |
| 2 | Guest at exactly 180000 ms: warning due, still active, expiry remains 300000 ms after last activity. |
| 3 | Guest between 180000 and 300000 ms: warning state, protected actions still allowed under valid session. |
| 4 | Guest at exactly 300000 ms: expired; timeout takes precedence over warning and cannot be renewed. |
| 5 | Guest after 300000 ms: denied even if browser timer suppressed; no late report revival. |
| 6 | Guest activity at 2:59 (179000 ms) resets warningAt to 359000 ms (5:59) and expiry to 479000 ms (7:59). |
| 7 | Guest accepted activity during warning at 4:00 resets warningAt to 7:00 and expiry to 9:00; clears warning in all reconciled tabs. |
| 8 | Guest warning display/countdown/timer/status read does not change lastActivity, activity revision or expiry. |
| 9 | Guest background state/telemetry/error/media/prefetch traffic during warning does not renew. |
| 10 | Explicit guest entry after timeout creates a new UUID and only one current lifecycle. |
| 11 | Account before 300000 ms idle: active, no warning; same account/session retained. |
| 12 | Account at exactly 300000 ms: warning due, still active, expiry unchanged. |
| 13 | Account between 300000 and 600000 ms: warning, authenticated session still valid. |
| 14 | Account at exactly 600000 ms: expired despite future JWT cryptographic expiry. |
| 15 | Account after 600000 ms: denied; no timer suppression or backdated event resurrection. |
| 16 | Account activity at 4:59 (299000 ms) resets warningAt to 599000 ms (9:59) and expiry to 899000 ms (14:59). |
| 17 | Account accepted activity during warning at 8:00 resets warningAt to 13:00 and expiry to 18:00; warning clears. |
| 18 | Account warning display/countdown/timer/status read does not renew. |
| 19 | Account background state/telemetry/error/media/framework traffic during warning does not renew. |
| 20 | Same-account local email verification returns original auth_user.id and all persisted rooms, room/item photos, decisions, analyses and Toparla results; no deletion or ownership change. |
| 21 | Guest session snapshot is warning_after_ms=180000 and idle_timeout_ms=300000, selected by server. |
| 22 | Account session snapshot is warning_after_ms=300000 and idle_timeout_ms=600000, selected by server. |
| 23 | Client cannot request account timing for a guest or guest timing for an account, including activity/session update calls. |
| 24 | Client cannot override warningAt/expiry, duration, policy version or lastActivity with arbitrary future values. |
| 25 | Guest/account identity transition establishes a new lifecycle with correct immutable timing snapshot; activity cannot change it. |
| 26 | Tab A accepted activity clears/reschedules a visible warning in B from the new shared timestamps. |
| 27 | B warning/deadline callback reconciles without renewal; stale local warning must not expire A-renewed session. |
| 28 | Warning display or dismissal alone never reports activity: test root pointer/click/keyboard capture exclusions; an explicit trusted app action still may renew. |
| 29 | Confirmed shared timeout propagates; stale broadcasts/401s cannot end a newer lifecycle. |
| 30 | Guest/account transitions across tabs carry their distinct warning/deadline policies and clear old warning state. |
| 31 | Idle open foreground tab shows warning and locks at its own identity-specific boundary without product API action; no periodic activity heartbeat. |
| 32 | Sleep/wake before warning, inside warning interval and at/after expiry: reconcile immediately, show actual remaining time, never grant a fresh warning period. |
| 33 | BFCache/pageshow and browser process restore validate before private use; restore/focus itself never renews. |
| 34 | New guest cannot list/read/write old rooms/photos/decisions/analyses/attachments; old guest rows/files remain unchanged in isolated DB/filesystem. |
| 35 | Guest timeout and explicit new entry preserve access_ok; onboarding then Keşif with no inherited work. |
| 36 | Account timeout shows email reauthentication, never creates guest or resets account data; access_ok survives. |
| 37 | Reauthenticated account with work lands Home; account without work lands Keşif; fresh session uses account timing. |
| 38 | Old JWT replay, repeated auth/session reads and forged client update fields cannot bypass server idle policy. |
| 39 | Explicit logout and direct Auth.js signout revoke expected server sid and notify tabs; delayed old logout cannot revoke successor. |
| 40 | Concurrent bootstrap/entry, lost response and competing creation keys have one atomic current winner; no per-API guest minting. |
| 41 | Private room/photo/account/analysis/Toparla rendered state cleared on confirmed timeout; late responses cannot restore it. |
| 42 | Old guest attachment IDs and room/result context never enter next lifecycle requests. |
| 43 | Unsent text survives provisional validation errors but is discarded on confirmed timeout; no localStorage/IndexedDB draft persistence. |
| 44 | Selected unsubmitted photo preview is revoked and File released on confirmed timeout; no automatic upload after reentry. |
| 45 | No automatic message resend, mutation replay, provider retry or re-upload on reconnect/re-auth/status success; uncertain save reconciled by reads. |
| 46 | All four protected media routes including errors use private no-store; test with browser cache enabled. |
| 47 | New guest/different account cannot fetch old owned media using known IDs/URLs; lifecycle URL partition is not an authorization bypass. |
| 48 | Versioned media URLs are not reconstructed from old state; document prior immutable-cache limitation and validate transition. |
| 49 | Active text/image-only/image+text, context and contextual actions remain correct with provider stubs. |
| 50 | Timeout resets conversation for both types, including same-account re-login; fresh conversation succeeds without old attachment 404 loops/repeated uploads. |
| 51 | Guest Toparla gate rejects before claim/provider; same-account reauth restores account authorization. |
| 52 | Toparla confirmation followed by warning/timeout/re-login causes zero automatic generation/retry calls. |
| 53 | Pre-timeout accepted Toparla operation completes once under original account; timeout does not delete result; same-account authorized GET retrieves it without paid call. |
| 54 | Correctly signed legacy 180-day and a68405f one-hour guest credentials are rejected under v2; neither is imported into a new lifecycle. |
| 55 | Existing 30-day JWT lacking sid/version denied by API, auth/session and account-based owner SSR/proxy authorization. |
| 56 | Unchanged access token continues working across migration, warning, timeout and reauthentication for both identity types. |
| 57 | Different devices of same account have independent idle sessions; activity/warning on one does not renew another. |
| 58 | New policy snapshots, exact equality and +/-1ms boundaries are deterministic under injected clock; warning never extends deadline; no provider/email calls. |

Additional mandatory edge tests:

- Trusted versus synthetic DOM events, mobile input/IME/file change, modifier/repeat filtering, assistive click, pointermove/scroll/focus exclusion; trailing activity report stops after final event.
- Exact clock boundary, future/old/out-of-order report, duplicate report, simultaneous expiry/activity, client clock rollback and delayed report after deadline.
- Multi-connection SQLite transaction contention; every protected API rejects sid/family/expected-lifecycle mismatch and fails closed on store errors.
- Delayed Auth.js cookie refresh, stale logout cleanup and stale email intent after newer login; no old credential regains authorization even if cookie ordering harms availability.
- Cross-origin activity/guest/logout attempts, absent/invalid CSRF, rate limits; family cookie alone and replayed expired creation key cannot retrieve active private credentials/data.
- Native account callback with request-local family binding, same-browser code flow, new-browser link, expired login intent and different-account verification.
- Two sessions of the same account in different devices expire independently. Same owner ID does not reuse private React state across sessions.
- BFCache/hidden-page privacy cover, browser process restore and local draft discard; BroadcastChannel fallback and Web Locks unavailable behavior.
- Account generation accepted before expiry but completed after; process crash leaves pending status without automatic retry. No held DB lock during provider wait.
- Named staging policy resolves guest 180000/300000 and account 300000/600000 warning/timeout snapshots; unknown configuration fails closed, clients cannot override kind/durations, and production remains unselected.

The old “206 + 15” result is historical, not an acceptance target. New tests must prove these behaviors rather than merely increase a count. Production-mode HTTP integration is required because dev-only same-request cookie behavior is not a reliable architectural contract.

## 24. Rollout plan

1. Later local implementation in a new commit, with tests first and additive schema; no history rewrite. Replace obsolete request-based renewal and add the common lifecycle protocol.
2. Run isolated unit/store/route/auth/browser suites and production build with providers blocked/stubbed. Verify protected-media cache behavior, SSR owner gate, cookie races and old credential rejection.
3. Independent code review against this addendum and GST-01 through GST-04. Confirm no hidden read-based activity writer, no account-ID migration, no silent guest fallback, and no automatic paid retries.
4. Only after that review approves staging: explicitly configure named staging policy, back up existing data according to normal process, deploy code/client/schema together and perform the legacy session/cache transition. Keep `access_ok` unchanged; require testers to refresh/close old tabs.
5. Staging manual verification with two real tabs, mobile/photo picker, real elapsed guest 3m/5m and account 5m/10m warning/idle boundaries, suspend/resume, cache enabled, existing accounts and old cookies. Provider actions stay stubbed unless separately authorized.
6. Observe session-end reasons and aggregate counts without collecting interaction content. Do not repurpose telemetry into the authority.
7. If rollback is needed, use a compatible forward fix or maintenance gate. Do not revert to legacy credential acceptance while claiming this idle policy. Additive session rows and all private data remain retained.

No production rollout or timeout value is approved by this addendum. No deployment action was taken.

## 25. Risks / limitations

- Genuine human presence cannot be proven from a normal browser activity API. Deliberate authenticated activity spoofing remains possible while active; expired credentials still fail.
- Bounded reporting latency/coalescing and server/client clock estimation cannot reproduce the exact physical moment of interaction. Offline/delayed activity may expire conservatively; no backdated revival.
- Passive reading/mouse-wheel-only usage can time out under the chosen minimal event set. This is disclosed and testable.
- Suspended JavaScript cannot fire at the exact deadline; privacy is enforced server-side and before resumed use. OS snapshots/downloaded bytes cannot be recalled.
- Old immutable caches and already-loaded old clients require the explicit staging transition; new response headers alone are insufficient.
- Web Locks availability is a staging browser-support requirement for automatic multi-tab entry. Broadcast delivery is advisory; server status is authoritative. Closed/crashed tabs and delayed cookie responses can cause reauthentication inconvenience but must never restore ended authorization.
- Database availability becomes part of every private authorization. The existing single SQLite architecture supports this; independent replica databases do not. Fail closed and show a recoverable service error on contention/outage.
- Confirmed expiry discards local unsent drafts/files in V1. Same-account data survives, but unsaved conversation text is not a durable account asset.
- Already accepted provider work may finish after expiry; response cannot be shown until reauthentication. Process crashes can leave pending operations; no automatic retry is permitted.
- Session metadata and orphaned guest private data accumulate until a separate retention policy is designed. Timeout is not deletion.

## 26. Final verdict

**SAFE TO IMPLEMENT THIS ARCHITECTURE**

This recommends one specific identity-aware staging design: guest warning 3m/timeout 5m and account warning 5m/timeout 10m, including its human-activity trust limit, two-table schema, credential migration, explicit lifecycle transitions and test gates. The timing split adds no unresolved BLOCKER/HIGH architectural issue: the same session store/controller uses server-issued per-kind snapshots and derives both deadlines from accepted activity. It is architecture approval only: it does not declare the current a68405f implementation safe for the new requirement, authorize deployment, or select a production timeout.

Revision verification: the entire document was searched for obsolete common-duration values, old warning assumptions and minute-29/30/59 scenarios. Only the explicitly superseded historical policy statement retains its old duration; all normative timing, examples, schema snapshots, configuration and test scenarios use the final identity-aware policy. References to existing 30-day Auth.js JWTs describe credential lifetime/migration, not the new idle deadline.

Repository state on entry to this task: HEAD a68405f; the earlier independent review report was already untracked, along with `toparla-benchmark-15.png`; the design-reference PNG deletion was pre-existing. The architecture report was already present before this final policy revision. This revision modifies only this report and leaves those other items unchanged. Application/test/configuration and prior-review file fingerprints are checked again before final handoff.
