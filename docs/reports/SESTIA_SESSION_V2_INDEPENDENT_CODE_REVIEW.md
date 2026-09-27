# SESTIA — Session V2 + Visitor Observability — Independent Code Review

**Status:** READ-ONLY REVIEW. No application code, test, schema, or configuration was modified. Nothing was committed, pushed, deployed, or changed on Railway/environment variables. No live AI/email provider was called. `npm test`, `npm run build`, and `npx playwright test` were run for verification only; the working tree was confirmed unchanged before and after.

**Repository state reviewed:**
```
HEAD: 20bd3d531972979cf81353b6660734a97365c219  (feat: add Session V2 and visitor observability)
git status: only pre-existing, unrelated items —
  D  design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png
  ?? toparla-benchmark-15.png
```

**Tests/build run during this review (unmodified):** `npm test` → 253/253 pass. `npm run build` → succeeds, all routes registered. `npx playwright test` → 5/5 pass. **None of these 258 passing tests exercise the specific scenario that exposes the HIGH finding below** — this is itself a review finding, not just a caveat.

Per instructions, the architecture document is treated as authority; the implementation report's claims were independently re-verified against the actual source, not trusted.

---

## VERDICT

**SAFE FOR STAGING AFTER SPECIFIC FIXES**

The server-side authorization boundary is sound: every private route, private-media route, and Toparla gate independently re-validates through `lib/session.js`/`sessions.check()`, and no path was found where an expired, revoked, replaced, or forged credential can read or write private data. However, one **HIGH**-severity client-side bug defeats the architecture's core "locks automatically at the deadline, without requiring further interaction" guarantee — the exact scenario a shared-device idle-timeout feature exists to protect — and the two deviations the task asked me to specifically verify are both confirmed real. Both required fixes are small, well-understood, and low-risk to apply. Recommend fixing the two HIGH items (and re-testing them) before staging is used by anyone outside the implementation team; the MEDIUM/LOW items and the acknowledged test-matrix breadth gap are acceptable to ship to a small private staging cohort with the fixes noted.

---

## Findings

### BLOCKER

None found. No path was identified where private data becomes readable/writable by an unauthorized or stale identity at the server layer.

---

### HIGH-1 — Automatic deadline-triggered lock does not fire without further user interaction (stale closure)

**File/function:** `components/SessionLifecycleProvider.js`.

**Evidence:** `scheduleTimers` is memoized with an **empty** dependency array (`useCallback(..., [])`, line 37/50) and its deadline `setTimeout` calls `validate()` (line 48). The visibility/focus/pageshow effect (lines 156–169) and the BroadcastChannel/`storage` effect (lines 174–199) are **also** memoized with empty dependency arrays and also call `validate()`/reference it indirectly. But `validate` itself is declared via `useCallback(..., [applyActiveStatus, endLifecycle, status.ownerId, status.state])` (line 60–77) — a **new** function every time `status` changes. Because the three `[]`-deps effects were created once, at mount, they permanently close over the **mount-time** `validate` — whose own body still reads `status.ownerId`/`status.state` as they were at mount (`null`/`'unknown'`), forever, via that specific captured closure.

**Consequence, traced exactly:** when the deadline timer (or a focus/visibility/broadcast "renewed" event) fires and the real server state has expired, the stale `validate()` runs, sees `data.state !== 'active'`, checks `else if (status.state === 'active')` — always false in this closure — and falls through to a plain `setStatus({state: data.state, ...})`. It **never calls `endLifecycle()`**. Since `endLifecycle()` is the **only** thing that invokes `onLifecycleEnded` → `app/page.js`'s `handleLifecycleEnded` → the `gen` bump that remounts `PageInner` (confirmed: `useSessionLifecycle()` is called nowhere inside `PageInner`, only inside `WelcomeView`, per `grep -n useSessionLifecycle app/page.js` → line 1741 only) — **the private UI (rooms, photos, chat, Toparla state already rendered in the DOM) is never automatically cleared when the deadline passes on an idle-but-open tab.** The reset only happens today via the **one** non-stale path: the activity-listener's own `handle` function (recreated on every `status.state` change, so its `endLifecycle` call at line 142 is not stale) — i.e., **only if the user interacts again after expiry**, which is the opposite of what an inactivity-lock feature is for.

**Why this matters:** the architecture's explicit requirement (§11: "Foreground idle tab: locally lock at the known deadline **without waiting for the next product API**") and the entire threat model motivating this feature (someone walks away from a shared/unattended device) are not met. Server-side data access remains correctly blocked (any real request still 401s via `lib/session.js`), so this is a **client-side UX/privacy** defect, not a remote-exploitable data breach — but it is precisely the failure mode this feature was built to prevent.

**Confirmed by:** manual trace of the closure chain above; independently reproducible by reading the code (no test in the 258 passing tests exercises "leave the tab idle past the deadline with zero further interaction and assert the private UI clears itself" — this exact scenario is the one this bug hides in).

**Minimal correction:** make `validate` stable (not recreated per-status-change) by reading current status through a ref instead of the closed-over `status` state, e.g. keep a `statusRef` updated alongside every `setStatus` call and have `validate` read `statusRef.current` instead of `status` — then `validate` can drop `status.ownerId`/`status.state` from its own dependency array and become referentially stable, so the three `[]`-deps effects that capture it at mount will always be calling logic that reads current data. (`endLifecycle` itself does not need this fix — its own body only depends on the stable `onLifecycleEnded` prop and correctly performs the full reset whenever it is actually called from anywhere.)

**Test required after the fix:** a Playwright test that establishes a guest, artificially shortens its remaining window via the same direct-DB technique already used in `tests/guest-onboarding-e2e.test.cjs` (or waits past a short injected deadline), takes **no further action**, and asserts the private UI (e.g., the Keşif/Home view) is replaced by the guest/account entry screen within a bounded time — i.e., proving the lock fires without a subsequent click. This is a **STAGING BLOCKER** test to add (it is what would have caught HIGH-1).

---

### HIGH-2 — Policy-value drift can revoke every active session, not just future ones (confirmed spec deviation)

**File/function:** `lib/sessionStore.cjs`, `check()`, line 45:
```js
if(r.policy_version!==p.version || r.idle_timeout_ms!==p.idleTimeoutMs || r.warning_after_ms!==p.warningAfterMs) return {...base,state:'session_revoked'};
```

**Verified against the architecture (§18):** *"Choose A: store warning_after_ms on each session, alongside idle_timeout_ms. This keeps warning/expiry thresholds tied to the same immutable server-issued policy snapshot even during configuration changes... Policy changes require an explicit version/transition rather than silently changing existing rows."* And (§2, locked policy table preamble / task instructions for this pass): *"Ordinary future policy timing changes affect NEW sessions only. They do NOT silently mutate existing active session timing. Only an explicit policy-version invalidation mechanism may force old sessions to reauthenticate."*

**The code compares the row's own frozen `idle_timeout_ms`/`warning_after_ms` snapshot against the CURRENTLY-resolved live policy's values**, not just the version. This means any future edit to `lib/sessionPolicy.cjs`'s numeric values (e.g., tuning the guest timeout from 5 to 6 minutes) — even without bumping `version` — would cause **every currently-active session, staging-wide, to be revoked on its very next request**, contradicting "affect NEW sessions only" directly.

**Confirmed dormant today, not a live incident:** `lib/sessionPolicy.cjs` defines exactly one named policy (`staging-idle-v2`) with fixed literal values, and nothing in the current deployment changes them at runtime — so this bug cannot fire under the code as it stands right now. It is a real, verified latent defect that will manifest the moment anyone tunes these numbers in the future (a plausible near-term event, given the pace of iteration on this exact feature across this engagement's own history), causing an unannounced mass-logout of every active guest/account session.

**Minimal correction (one line):**
```js
if(r.policy_version!==p.version) return {...base,state:'session_revoked'};
```
Drop the `idle_timeout_ms`/`warning_after_ms` comparisons — the row's own stored snapshot values are already what every other part of `check()`/`activity()` correctly uses for the actual expiry/warning math (lines 47–49, `activity()` line 89); only the version-vs-version comparison is the intended "explicit invalidation" mechanism the architecture calls for. (Note: `resolvePolicy`'s `version` is currently a hardcoded literal, `2`, not derived from the timing values — so a deliberate future policy change would also need a human to remember to bump it if invalidation is actually wanted; that is consistent with "explicit," not automatic, and is not a defect to fix now.)

**Test required after the fix:** a `tests/session-store.test.cjs`-style deterministic test that establishes a session under one resolved policy, then re-resolves `check()` against a policy stub returning **different** `idleTimeoutMs`/`warningAfterMs` but the **same** `version`, and asserts the session remains `'active'` (not revoked) — plus a companion asserting a **version** change **does** revoke it. **STAGING BLOCKER** for the fix (one line, trivial to verify, and the failure mode is severe — a surprise mass logout — for a fix this cheap not to make before further iteration on staging).

---

### HIGH-3 — Visitor observability is not captured for account sessions (confirmed, exactly as the implementation report admits)

**Verified:** `grep -rn visitMetadata` across the repository shows exactly one call site, `app/api/session/guest/route.js`. `lib/auth.js`'s `jwt` callback (the only place `sessions.account(...)` is called, lines 152–171) never references `visitMetadata`, `lib/geo.cjs`, or `lib/userAgentClass.cjs`.

**Task's own requirement, verified against the instruction that opened this whole feature:** *"Visitor/session observability must work for BOTH guest and account sessions."* This is unambiguously not met today — every account session in `/admin`'s new "Oturumlar / Ziyaretler" section will show `bilinmiyor`/null for location, device, OS, and browser, forever, with no code path that will ever populate it for that identity type.

**Severity framing:** this is a **completeness** gap, not a correctness or security defect — no data is wrong, leaked, or unsafe; a whole identity type is simply invisible in the observability feature. Given the explicit, repeated instruction that observability must cover both types, I am classifying it HIGH-for-the-feature-as-specified rather than MEDIUM, while noting it does **not** block staging safety in the security/privacy sense the verdict is about.

**Minimal correction:** inside `lib/auth.js`'s `jwt` callback, in the same `if (familyId && intent) { ... }` block that calls `sessions.account(...)`, add the equivalent capture using `headers()` from `next/headers` (the same request-scoped mechanism already proven safe for `cookies()` in this exact file):
```js
import { cookies, headers } from 'next/headers';
import { lookupCoarseGeo } from '@/lib/geo.cjs';
import { classifyUserAgent } from '@/lib/userAgentClass.cjs';
import { clientIp } from '@/lib/clientNetwork.cjs';
import rawDb, { sessions, visitMetadata } from '@/lib/db';
...
if (familyId && intent) {
  const established = sessions.account(familyId, intent, user.id);
  token.sestiaSid = established.sessionId;
  token.sestiaPolicyVersion = established.policyVersion;
  try {
    const h = await headers();
    const geo = lookupCoarseGeo(clientIp(h));
    const ua = classifyUserAgent(h.get('user-agent') || '');
    let referrerHost = null;
    try { referrerHost = h.get('referer') ? new URL(h.get('referer')).hostname : null; } catch {}
    visitMetadata.record(established.sessionId, { ...geo, ...ua, referrerHost });
  } catch {}
}
```
`entryPath`/UTM fields will legitimately stay null for account establishment (they are not available at this point in the Auth.js redirect flow) — acceptable, since they are already-nullable, non-critical fields.

**Test required:** an E2E assertion (extending `tests/guest-onboarding-e2e.test.cjs`'s existing `signUpWithCode` flow) that a `session_visit_metadata` row exists for the account's established session after login, with `device_class`/`browser` populated. **REQUIRED BEFORE PRODUCTION**, not a staging blocker — staging can proceed with guest-only observability disclosed as a known gap if time-constrained, but should not ship to production without this.

---

### MEDIUM-1 — Account branch of `getSessionState()` trusts `identityType: 'account'` without verifying the resolved row's own `kind`

**File:** `lib/session.js`, line 43–44:
```js
const result = sessions.check(authSession.sestiaSid, familyId);
return { ...result, identityType: 'account', ownerId: result.ownerId ?? authSession.user.id };
```
This force-overwrites `identityType` to `'account'` regardless of what `sessions.check()` actually determined the row's `kind` to be. **Not currently exploitable**: `token.sestiaSid` can only ever be populated by `lib/auth.js`'s verified-login branch, which always calls `sessions.account(...)` (hardcoded `kind: 'account'` in `sessionStore.cjs`'s `establish()`), and the JWT itself is encrypted with `AUTH_SECRET` — no path exists today for an attacker to make `sestiaSid` reference a guest-kind row without already possessing `AUTH_SECRET` (full compromise, out of scope). Recommended defense-in-depth, not urgent: have `getSessionState()` check `result.identityType === 'account'` (i.e., the row's real `r.kind`) before trusting it, returning `session_revoked` on a kind mismatch instead of silently coercing. The guest branch (line 53) does **not** have this issue — it returns `sessions.check()`'s own `identityType` unmodified.

### MEDIUM-2 — `POST /api/session/activity` does not re-check `privateAccess.isAllowedEmail`

**File:** `app/api/session/activity/route.js`, lines 21–27. Unlike `lib/session.js`'s `getSessionState()` (which explicitly checks `isAllowedEmail` before trusting an account session), the activity route only checks `authSession?.sestiaSid` truthiness. **Verified dormant under the current staging configuration**: `lib/privateAccess.cjs`'s `isAllowedEmail()` returns `true` unconditionally unless `PRIVATE_OWNER_EMAIL` is set (not the normal SESTIA multi-user staging mode). If that env var is ever set while this multi-user path is still reachable, a since-disallowed account could keep renewing (but not actually reading/writing any private data, which remains correctly gated everywhere else). Minimal correction: add the same `isAllowedEmail` check before calling `sessions.activity()` for an account session. **FOLLOW-UP.**

### MEDIUM-3 — `app/api/admin/session-internal-test/route.js` has no same-origin/CSRF check, inconsistent with the new session routes

**Verified:** the five new `/api/session/*` mutation routes all call `isSameOriginRequest(req)` (`lib/sameOrigin.cjs`); this new admin mutation route does not. **Not currently a live CSRF hole**: `admin_ok` is `sameSite: 'lax'` (`app/api/admin-access/route.js`), and modern browsers already exclude `SameSite=Lax` cookies from cross-site POST requests (the classic CSRF vector), so a foreign page's auto-submitting form would not carry the cookie in any current evergreen browser. Still, this is an inconsistent application of the defense-in-depth pattern established elsewhere in the same commit. Minimal correction: add the same `isSameOriginRequest(req)` check. **FOLLOW-UP.**

---

### LOW / NOTE

- **`lib/sameOrigin.cjs` fails open when both `Sec-Fetch-Site` and `Origin` are absent** (`if (!origin) return true`). Modern evergreen browsers send at least one of these on every cross-site POST, and `SameSite=Lax` cookies provide an independent layer, so this is not practically exploitable today, but a stricter default (fail closed, i.e. return `false`, when both signals are missing) would be more conservative. **FOLLOW-UP.**
- **`app/api/admin/session-internal-test/route.js` does not validate `sessionId` is UUID-shaped** before writing it to `session_visit_metadata` (parameterized SQL, no injection risk, but an admin/CSRF-tricked-admin could write an orphaned metadata row for a nonexistent session id — harmless, since this table is never consulted for authorization). **NOTE**, no action needed before staging.
- **`geoip-lite`'s ~111MB addition to `node_modules`** (verified in the implementation report and by this reviewer independently understanding the same tradeoff) is a real, disclosed deploy-size cost; not a defect, just worth Railway build-time monitoring on first deploy. **NOTE.**
- **Toparla claim-boundary reasoning re-verified independently**: both `app/api/chat/toparla/route.js` and `app/api/rooms/[id]/toparla/route.js` call `getIdentity()` (now Session-V2-backed) immediately before their synchronous claim, with no meaningful `await` in between and no DB transaction held open during the provider call — confirmed correct, matching the implementation report's claim exactly.
- **`access_ok` independence, guest data isolation, forged/legacy-credential rejection, account-precedence-over-legacy-JWT, and private-media ownership checks** were all re-verified by re-reading the relevant source (`proxy.js`, `lib/session.js`, all four media routes) and by the passing `tests/guest-onboarding-e2e.test.cjs` suite; no discrepancy from the implementation report's claims was found in any of these areas.
- **Landing rule** (`landingView()` in `app/page.js`) is untouched by this task (confirmed via diff), and its inputs (`hasStartedWork`/`totalDecisions`) are unaffected by anything in this implementation.

---

## Missing Test Coverage — Classification

| Gap | Classification | Why |
|---|---|---|
| Automatic deadline-lock with **no** further interaction (would have caught HIGH-1) | **STAGING BLOCKER** | Directly tests the core privacy guarantee this whole feature exists for; cheap to write once HIGH-1 is fixed. |
| Policy-value-drift-does-not-revoke test (would have caught HIGH-2) | **STAGING BLOCKER** | One-line fix, cheap deterministic test, severe failure mode (mass logout) if left unverified before further iteration. |
| Account-session visitor-metadata row exists after login (would have caught HIGH-3) | **REQUIRED BEFORE PRODUCTION** | Completeness gap, not a security/correctness defect; acceptable to disclose and defer past initial staging. |
| Full architecture §23 58-scenario/edge-test breadth (sleep/wake stress, BFCache process-kill, two-device independence, Web-Locks-unavailable fallback, assistive-technology activation, etc.) | **FOLLOW-UP** | Already explicitly and reasonably scoped out in the implementation report's §19; this review agrees with that scoping *except* for the one scenario now promoted to STAGING BLOCKER above, which was previously bundled into this same "acceptable to defer" category and should not have been. |
| `/api/session/activity` isAllowedEmail check test | **FOLLOW-UP** | Dormant in current multi-user staging mode. |
| Admin route same-origin test | **FOLLOW-UP** | Not practically exploitable given `SameSite=Lax`. |

Not requiring the entire original 58-scenario matrix before staging, per the task's instruction — only the two scenarios tied to confirmed HIGH defects are promoted to blocker status.

---

## Minimal Correction Plan (Summary)

1. **`components/SessionLifecycleProvider.js`** — make `validate` read current session status via a ref rather than a closed-over `status` state value, so it becomes referentially stable and the mount-time-captured effects (deadline timer, focus/visibility/pageshow, BroadcastChannel/storage) always execute current logic. Add the "idle past deadline, no interaction, UI locks anyway" test.
2. **`lib/sessionStore.cjs`**, `check()` line 45 — compare only `r.policy_version !== p.version`; drop the `idle_timeout_ms`/`warning_after_ms` live-value comparisons. Add the policy-drift-does-not-revoke test (and the companion version-bump-does-revoke test).
3. **`lib/auth.js`** — add visitor-metadata capture in the verified-login branch of the `jwt` callback, mirroring `app/api/session/guest/route.js`'s pattern. Add the account-session-has-visit-metadata test. (Not a staging blocker; recommended before production.)
4. *(Follow-up, not required before staging)* `lib/session.js` account-branch kind verification; `/api/session/activity`'s `isAllowedEmail` check; `/api/admin/session-internal-test`'s same-origin check.

None of these require a schema change, a new dependency, or a change to the locked timing values/copy/endpoint contracts — all three required fixes are small, localized, and consistent with patterns already established elsewhere in the same commit.

---

## Additional Regression/Security Issues Discovered Beyond the Implementation Report

Beyond the two deviations the task asked me to specifically verify (both confirmed as HIGH-2 and HIGH-3 above), the one issue this review surfaced that the implementation report did **not** disclose or anticipate is **HIGH-1** (the stale-closure automatic-lock failure) — a genuine gap in the implementer's own self-review, caught here by tracing the exact `useCallback` dependency chains rather than trusting that "the tests pass." No other undisclosed security or correctness issue was found; every other area requested for scrutiny (guest/account authorization, sestiaSid binding, resurrection, multi-tab concurrency, logout/replacement, private media, Conversation, Toparla, access_ok, landing, raw-IP handling, GeoIP, `/admin`) matched the implementation report's claims on independent re-verification, modulo the MEDIUM/LOW items listed above.
