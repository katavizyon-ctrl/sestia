# SESTIA — Guest Session 1-Hour Inactivity Timeout — Implementation Report

**Basis:** `docs/reports/SESTIA_GUEST_SESSION_TIMEOUT_AUDIT.md` (verdict: SAFE TO IMPLEMENT AS DESIGNED).
**Implementation base:** staging checkpoint `9d49424f2e32326c698a50c2b732770fb5b7a702`.
**Status:** Implemented locally, fully tested, build verified. Not pushed, not deployed, not merged, no Railway changes, no live AI provider calls.

---

## 1. Exact Behavior Implemented

Guest (anonymous) identity now expires after **1 hour of inactivity**, rolling: any qualifying request while the guest is within its current window renews that same window for another hour, and the guest identity itself never changes while renewed. Only a request that arrives after the window has fully lapsed causes a new, disjoint guest identity to be issued. Access-code authorization (`access_ok`) and authenticated account sessions are untouched by this change, both in code and in observed behavior (see Sections 9–10).

---

## 2. Files Changed

| File | Change |
|---|---|
| `lib/guestToken.js` | `GUEST_MAX_AGE_MS`: 180 days → 1 hour. `createGuestToken()` gains an optional `existingGuestId` parameter (validated against the existing UUID regex before reuse); omitted/invalid falls back to `crypto.randomUUID()`, identical to prior behavior. `verifyGuestToken()` is byte-for-byte unchanged. |
| `proxy.js` | The guest-cookie block now always renews the cookie on every request that reaches that point (i.e., every request already past the static-asset matcher, `PUBLIC_PATHS`, `/api/auth/*`, `/admin*`, and the `access_ok` check) — reusing the existing guest id when the incoming cookie still verifies, minting a fresh one only when it doesn't. Previously it only minted when the cookie was invalid. |
| `tests/guest-onboarding-e2e.test.cjs` | Extended (not duplicated) with 6 new full-stack checks covering rolling renewal, post-expiry identity rotation, data-retention-without-deletion, same-request cookie propagation, static/health-check inertness, and account/guest independence. |
| `tests/guest-token.test.cjs` (new) | Pure boundary-logic unit tests for `createGuestToken`/`verifyGuestToken` (identity-preserving renewal, malformed-id rejection, 1-hour window, exact expiry boundary, tamper rejection, cross-secret rejection). |

No other file was modified. `lib/identity.js`, `lib/accessToken.cjs`, `app/api/access/route.js`, Auth.js configuration, and every `device_id`-scoped store file are untouched.

---

## 3. Old Guest Lifetime

Fixed 180 days from creation, never refreshed while valid (original architecture, single commit in `lib/guestToken.js`'s entire history prior to this change).

## 4. New Guest Lifetime

1 hour, **rolling** from the most recent qualifying request — not a fixed lifetime from creation. Confirmed by test: `createGuestToken: rolling window is 1 hour, not the old 180-day lifetime` (`tests/guest-token.test.cjs`) and `rolling renewal: activity just before the boundary keeps the same identity and pushes expiry back out to ~1h` (`tests/guest-onboarding-e2e.test.cjs`).

## 5. Rolling-Renewal Mechanism

`proxy.js`, on every request that reaches the guest-cookie block:
```js
const existingGuestId = verifyGuestToken(req.cookies.get(GUEST_COOKIE)?.value);
const { token, expiresAt } = createGuestToken(existingGuestId || undefined);
res.cookies.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: ..., expires: expiresAt, path: '/' });
```
If the incoming cookie still verifies, `existingGuestId` is truthy and `createGuestToken` reuses it — **same identity, new expiry**. If it doesn't verify (missing, malformed, tampered, or past its embedded `expires`), `existingGuestId` is `undefined` and a brand-new `crypto.randomUUID()` is minted. The signature scheme, `httpOnly`/`sameSite`/`secure` flags, and the underlying `verifyGuestToken` logic are all unchanged from the existing security model.

## 6. Meaningful-Activity Definition (as implemented)

Unchanged from the audit's recommendation: activity = any request that reaches the guest-cookie block, i.e. anything **not** a static asset (excluded by `proxy.js`'s own `config.matcher`), **not** in `PUBLIC_PATHS` (`/hosgeldin`, `/giris`, `/api/access`, `/admin-giris`, `/api/admin-access`, `/api/health`, `/giris-hatasi`), **not** `/api/auth/*`, **not** `/admin`/`/api/admin/*`, and that already passed the `access_ok` check. No new classification logic was written — this is the existing control flow of `proxy.js`, verified empirically by test (`static assets and health checks never renew or reissue the guest cookie`: confirmed no `Set-Cookie: guest_session=...` on `/api/health` or `/favicon.ico`).

## 7. Same-Request Cookie Propagation — Empirical Finding

**Proven, not assumed**, via `tests/guest-onboarding-e2e.test.cjs`'s `same-request cookie propagation` check against the real dev server and the real (modified) `proxy.js`/`getIdentity()`:

> An expired-but-correctly-signed guest cookie, sent directly to an API route with no intervening page load, produces a **clean 401** on that exact request. `getIdentity()` (`lib/identity.js`, reading via `next/headers`'s `cookies()`) sees the request's *original* `Cookie` header, not the `Set-Cookie` that `proxy.js` places on the outgoing response — these are two different header directions and Next.js does not splice one into the other for the same request unless the proxy explicitly rewrites `NextResponse.next({ request: { headers } })`, which this implementation does not do (deliberately — see Section 17). The observed, tested outcome is: **401 on that first request; the following request (now carrying the freshly-issued cookie) resolves as a new, disjoint, empty-owning guest.**

This is documented directly in the Next.js 16 docs bundled with this project (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, "Using Cookies" / "Setting Headers" sections): response cookie mutations are delivered to the client, not spliced into the current request's own downstream view unless request headers are explicitly rewritten.

**This outcome is safe by construction**: no request can ever read or write as a "resurrected" expired identity — it's either flatly rejected (401) or, on the next request, treated as a brand-new identity that owns nothing. No hack, workaround, or architecture change was needed; the audited design works as intended, and this was the finding to prove, not a blocker.

## 8. Expiry / Onboarding Behavior

Unchanged code, exercised more often. `app/page.js`'s existing `isKnownGuest` check (comparing `localStorage`'s `sestia_guest_id_confirmed` against the server's current `identityId`) already renders the existing in-app `WelcomeView` whenever the identity changes out from under the client — this now also covers rotation caused by inactivity, with zero new UI code. Verified via test: a post-expiry guest gets `hasStartedWork: false` and cannot see the prior identity's rooms, which is exactly the input state `landingView()` needs to correctly land on Keşif (unchanged landing rule from commit `7789831`).

## 9. Access-Code Isolation

Verified unchanged and untouched:
- `lib/accessToken.cjs` / `app/api/access/route.js` were not modified.
- Test `inactivity beyond 1h: ...`: `access_ok`'s cookie value is asserted **identical** before and after a simulated >1h guest expiry, and the page load still returns 200 (no redirect to `/hosgeldin`).
- No code path in `lib/guestToken.js` or the modified block of `proxy.js` reads, writes, or checks `access_ok`.

## 10. Account Isolation

Verified unchanged and untouched:
- `lib/identity.js` (account-first precedence in `getIdentity()`) was not modified.
- Test `account session is unaffected even when the guest cookie is simultaneously expired`: an authenticated session resolves correctly to the account identity even with a deliberately expired `guest_session` cookie present in the same request.
- Test `account session still resolves to the account (and wins over a guest cookie)` (pre-existing, unmodified) continues to pass.

## 11. Data-Retention Behavior

**No deletion was implemented anywhere.** Test `inactivity beyond 1h: old guest is never resumed, a new disjoint identity is issued, old data is kept but hidden` directly queries the SQLite database after a simulated expiry and asserts the old guest's room row **still exists**, still owned by the old (now-unreachable) `device_id`, never reassigned or deleted. No `DELETE`/cleanup statement was added to any store file.

## 12. Privacy/Ownership Verification

No ownership architecture was changed. `device_id`-scoping (audited exhaustively in the prior read-only report) was re-verified in this task by direct test, not just by static review:
- A new post-expiry identity cannot list, open, or read the old identity's room (`404`).
- A new post-expiry identity cannot read the old identity's chat attachment bytes (`401` on the very first request per Section 7's finding, `404` on the identity-established next request).
- Guest-B-cannot-see-guest-A isolation (pre-existing test) continues to pass unchanged.

No unrelated ownership vulnerability was discovered during this work; none is reported.

## 13. Conversation/Toparla Regression Verification

All pre-existing regression suites for these features were run unmodified and pass in full against the new guest-token/proxy code:
- `tests/sestia-chat-route.test.cjs`, `tests/chat-multimodal.test.cjs`, `tests/chat-context.test.cjs`, `tests/chat-capabilities.test.cjs` — text-only chat, image-only/image+text messages, room/attachment/`toparla_result` context resolution, capability-truth stripping, exact-image targeting (attachment B selectable while A remains in history; invented ids stripped) — all pass.
- `tests/chat-attachments-route.test.cjs`, `tests/chat-toparla-route.test.cjs`, `tests/toparla.test.cjs`, `tests/toparla-image.test.cjs` — account gate (guest rejected before any claim/paid call), ownership checks, idempotency (duplicate submission replays without a second paid call), no-automatic-retry-on-failure, owner-only result serving, Room Detail Toparla — all pass.
- None of these tests exercise `lib/guestToken.js`/`proxy.js` directly (they inject `getIdentity()` results via VM-context mocks), so they are structurally insulated from this change; running them confirms no incidental breakage was introduced elsewhere.
- No live Anthropic or OpenAI call was made by any test in this task (all AI-touching tests use mocked/fake providers, consistent with existing convention).

## 14. Tests Added/Updated

- **New:** `tests/guest-token.test.cjs` — 7 pure unit tests (identity-preserving renewal, malformed-id rejection, 1-hour window, exact `Date.now() > expires` boundary, tamper rejection, cross-secret rejection).
- **Extended:** `tests/guest-onboarding-e2e.test.cjs` — 6 new full-stack checks added to the existing isolated-server harness (rolling renewal, post-expiry rotation + data retention + isolation, same-request propagation, static/health inertness, account/guest independence under simultaneous expiry, expired chat-attachment ownership). No existing check in this file was modified or removed.
- **Unmodified, re-run for regression confirmation:** every other test file in `tests/` (Toparla, Conversation, chat, room, decisions, access-token, private-access, syntax, etc.).

## 15. Final Test Counts

- `npm test` (`node --test tests/*.test.cjs`): **206 registered unit tests, 206 pass, 0 fail.**
- `tests/guest-onboarding-e2e.test.cjs` (script-style, 15 checks including the 6 new ones): all **PASS**, file exits 0.
- `tests/syntax.test.cjs` (compiles changed application files): pass.

## 16. Build Result

`npm run build` (`next build`, Turbopack): **succeeded**, all 22 app routes generated (static + dynamic) with no errors or warnings introduced by this change. Route manifest is unchanged in shape (no route added/removed).

## 17. Known Limitations / Remaining Risks

- **Same-request propagation yields a 401, not a silent same-request new-guest pass-through** (Section 7). This is safe but means a chat message (or any action) sent from an already-open tab, exactly at the moment its guest session has expired, will surface as a generic failure the first time; a retry succeeds as a fresh guest. No new client-side error handling was added for this — it already falls through the app's existing generic retry/error UI — but a more specific "your session expired, continuing fresh" message remains a possible future UX polish item (not implemented, out of scope per the task).
- `proxy.js` still unconditionally ensures a `guest_session` cookie exists/renews on every qualifying request even for browsers that are actually authenticated account holders (pre-existing behavior, unchanged by this task) — inert, since no route ever consults it when an account session is present, but worth noting as an existing quirk rather than something newly introduced.
- No env-var override was added for the 1-hour constant; it is a plain constant in `lib/guestToken.js`, matching how `access_ok`'s 180-day value is a plain constant today. Tests achieve determinism by hand-signing tokens with known `expires` values rather than by making the duration configurable — no test-only code path exists in production source.

## 18. Exact Commit Hash

This report is committed together with the implementation and tests in a single local commit (per the task's instruction to create exactly one commit). Since a commit cannot reference its own hash before it exists, the resulting hash is reported in the task's final chat summary to the user rather than inline here.
