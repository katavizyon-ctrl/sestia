# SESTIA — QA Audit (pass 1)

**Date:** 2026-09-26
**Build under test:** `main` @ `353cf9e` (working tree clean except one unrelated deleted design-reference PNG).
**Status:** Interim report. Testing and diagnosis only: no code changed, nothing committed or deployed.
**Next step (agreed):** switch staging to public email-only sign-in with basic abuse limits, then rerun this QA on staging as a fresh public user (pass 2).

---

## 1. How this pass was run

| Environment | What it is | What was tested |
|---|---|---|
| **Staging** `https://sestia-test-staging.up.railway.app` | Railway, production build, **owner-only mode** (`PRIVATE_OWNER_EMAIL` set) | Unauthenticated surface only: routing gate, API rejection, headers, login page. The owner did not sign in during this pass, so nothing behind the gate was reached on staging. |
| **Local isolated production copy** `http://127.0.0.1:3101` | `next build --webpack` + `next start` from a temp copy of the repo, empty temp database, fake AI key, test invite code, no Resend | All user flows as a guest; two-guest data isolation (HTTP); error states (real AI calls fail on the fake key); success states by replaying recorded AI responses in the browser (`/api/analyze`, `/api/sestia-chat` answered in-page; everything else hit the real local server) |

- **Browser tooling:** the repo has no Playwright/Cypress. It has `npm test` (81 `node:test` unit tests, **81/81 pass**, local DB fingerprint unchanged) and HTTP smoke scripts. This pass used the Claude desktop app's built-in browser pane (real clicks, DOM, console, network). No repo changes were needed.
- **Screenshots:** none. The browser pane was hidden during the session, so screenshot capture timed out and the 375px viewport emulation did not apply (the page still reported 1265px). Findings are backed by DOM text, network logs and source references instead.
- **Paid AI calls:** 0.
- **Console:** no JavaScript exceptions in the whole local session. The only console errors are the 401/500 responses triggered on purpose (wrong invite code, AI failure with the fake key).

---

## 2. Coverage matrix

| # | Area | Result | Where |
|---|---|---|---|
| 1 | Welcome / onboarding | ✅ works; copy notes (QA-08, QA-18) | Local; staging redirects to owner login |
| 2 | Name / preferred address | ✅ works, HTML escaped; QA-07, QA-08 | Local |
| 3 | Guest flow | ✅ works; account screen problem QA-06 | Local (disabled on staging by design) |
| 4 | Email login | ⚠️ partial: local shows the correct "E-posta ile giriş şu anda hazır değil" message (no Resend). Real magic-link delivery **not tested**. | Pass 2 |
| 5 | Returning-user session | ✅ reload keeps guest identity, name and data; browser restart not tested | Local |
| 6 | Home | ✅ works; QA-09, QA-18 | Local |
| 7 | Tek Eşya | ✅ error state + success (idea + one question), decision saved | Local |
| 8 | Oda Taraması | ✅ all four entry paths incl. roomless → save to new room → confirm, in-room scan, resume | Local; QA-12 |
| 9 | Image upload | ✅ multi-photo; ⚠️ MIME trusted (QA-03) | Local |
| 10 | AI analysis | ✅ UI handles success and failure; **real model output not tested** (0 paid calls) | Pass 2 |
| 11 | Decisions (Tut / Sat / Bağışla / Geri Dönüştür / At) | ✅ all five buttons render in approved order; Bağışla, At and room decisions saved; celebration says "Kararın: Bağışla" (a decision, not "donated") | Local |
| 12 | Odalarım | ✅ empty state, create, detail, history, decisions; QA-13 | Local |
| 13 | Sestia chat | ✅ error keeps the draft; resend works; role order correct after a failure; Keşif card passes context; QA-15 | Local |
| 14 | Navigation / back | ❌ QA-01 (browser Back leaves the app); QA-12 | Local |
| 15 | Refresh | ⚠️ QA-14, QA-15 | Local |
| 16 | Mobile 375px | ❌ **not tested**: viewport emulation did not apply while the pane was hidden | Pass 2 |
| 17 | Loading states | ✅ analysis, save and chat show progress; ⚠️ QA-14 | Local |
| 18 | Empty states | ✅ Odalarım, weekly tips hidden below 5 decisions | Local |
| 19 | Error states | ✅ wrong invite code, AI failure (Tek Eşya, chat, weekly tips), feedback failure (earlier pass) | Local |
| 20 | Auth boundaries / isolation | ✅ strong (see §4); ❌ no rate limiting QA-02 | Staging + local |

---

## 3. Findings

**Classification key:** Bug = confirmed bug · UX = UX problem · Visual = visual inconsistency · Confusing = expected behavior but confusing · Env = production/environment issue · Sec = security hardening.

### QA-01 — Browser / phone Back leaves the app — **major** · Bug
- **Screen:** every in-app screen (single route `/`)
- **Steps:** as a signed-in guest, go Home → Odalarım → a room. Press browser Back (on Android: the system back gesture).
- **Expected:** return to the previous in-app screen (room list).
- **Actual:** leaves the app to the previous document. Locally this was `/giris`, which asks for the invite code again even though the user already has access (see QA-17). On staging it would be `/ozel-giris` or the previous site.
- **Evidence:** `history.length` 4, only Next's internal state; `navigate back` landed on `/giris`.
- **Likely source:** `app/page.js`: screens are a `view` state with no `history.pushState`/`popstate` handling (grep finds none); `goTo()` around lines 240–255.
- **Reproducible:** always.

### QA-02 — No rate limiting on invite / admin codes (and nothing in front of email or AI) — **major** (before going public) · Sec
- **Route:** `POST /api/access`, `POST /api/admin-access`
- **Steps:** send 40 wrong codes in a row, then the correct one.
- **Expected:** throttling or lockout after repeated failures.
- **Actual:** 40× `401`, then `200` for the correct code. The comparison is a plain `!==`, not constant-time.
- **Staging today:** masked, because owner-only mode returns `401 private_access_required` for these routes.
- **Why it matters for the agreed public mode:** a code search finds no limiter anywhere, including magic-link sending (`/api/auth/signin/resend`), `/api/analyze`, `/api/sestia-chat` and `/api/inspiration`. Public email sign-in without limits would let anyone trigger unlimited Resend emails and Anthropic calls on your accounts.
- **Likely source:** `app/api/access/route.js:22`, `app/api/admin-access/route.js:14`; no shared rate-limit module exists.
- **Reproducible:** always (local).

### QA-03 — Photo upload trusts the declared MIME type — **minor** · Sec
- **Route:** `POST /api/rooms/:id/photos`
- **Steps:** upload a plain text file with `type=image/png`.
- **Expected:** rejected (content is not an image).
- **Actual:** `200 {"id":2,"mimeType":"image/png"}`; stored and later served as `image/png`. Readable only by the owner, so exposure is limited, but non-images can reach the AI call and the history view.
- **Likely source:** `app/api/rooms/[id]/photos/route.js:29–35` (checks `file.type` only), `lib/creationStore.cjs:42`.
- **Reproducible:** always.

### QA-04 — Missing security headers; framework disclosed — **minor** · Sec / Env
- **Route:** all (observed on staging `/ozel-giris`)
- **Actual:** no `X-Frame-Options` / `frame-ancestors`, no CSP, no `X-Content-Type-Options`, no `Referrer-Policy`; `x-powered-by: Next.js` present. `X-Robots-Tag: noindex` and `Cache-Control: private, no-store` are present (good).
- **Likely source:** `next.config.mjs` (no `headers()`; `poweredByHeader` not disabled).
- **Reproducible:** always.

### QA-05 — Client error reporting blocked before sign-in — **minor** · Env
- **Route:** `POST /api/error` on staging returns `401 private_access_required`.
- **Effect:** JavaScript errors on the login page (the only page public users see before signing in) never reach the error log.
- **Likely source:** `proxy.js` private branch (lines 12–31) allows only `/ozel-giris`, `/api/health` and `/api/auth/*`.

### QA-06 — "Hesabım" for a guest reopens onboarding — **major UX** · UX
- **Screen:** header "○" button (aria-label "Hesabım") → account
- **Steps:** as a named guest, tap "○".
- **Expected:** an account screen: current name (editable), sign-in option, maybe sign-out or data info.
- **Actual:** the onboarding choice screen again: "Nasıl devam etmek istersin? · Memnun oldum, <name>. · Misafir olarak devam et". Its Back goes to the name step ("Sana nasıl hitap etmemi istersin?"), not Home. To get back, the user has to click through onboarding again.
- **Also:** the icon is the literal text glyph "○" (`<span aria-hidden>○</span>`), which reads as a placeholder (Visual, polish).
- **Likely source:** `components/SestiaExperience.js:15` (header), `app/page.js` account view reusing the onboarding component (~1437–1450).
- **Reproducible:** always.

### QA-07 — "Şimdilik isimsiz devam et" still uses the name — **minor** · Bug
- **Steps:** enter a name → later open account → Back → "Şimdilik isimsiz devam et".
- **Expected:** continue without a name, or at least not greet by name.
- **Actual:** the name stays in `localStorage` and the next screen says "Memnun oldum, <name>."
- **Likely source:** `app/page.js:1442–1444`.

### QA-08 — Name screen copy mismatch — **polish** · Visual
- Heading "Sana nasıl hitap etmemi istersin?" (I) vs field label "Sana nasıl hitap edelim?" (we). `app/page.js:1437, 1439`.

### QA-09 — Keşif tab shows duplicated fallback copy for returning users — **minor** · Bug
- **Steps:** as a user with at least one decision or room, open the Keşif tab.
- **Expected:** a greeting and spark from the Sestia library, as first-time users get.
- **Actual:** "Bir fikirle, bir soruyla ya da sadece merakla başlayabiliriz." immediately followed by the near-identical fallback "Bir soruyla, bir fikirle ya da yalnızca merakla başlayabilirsin."
- **Cause:** `/api/state` returns `sestiaLibrary: null` once `hasStartedWork` is true (`app/api/state/route.js:33`), but the Keşif tab stays reachable from the bottom nav and falls back to its default text (`components/SestiaExperience.js:50–51`).
- **Reproducible:** always.

### QA-10 — "Kaydıma dön" doesn't lead to a record — **minor** · UX
- **Steps:** save a Tek Eşya decision started from Home → "Kaydıma dön".
- **Expected:** see the saved decision.
- **Actual:** goes to Home. Decisions not tied to a room are not viewable anywhere; only the "N karar" counter changes.
- **Likely source:** `app/page.js:2153` (`onHome`), no history view for roomless decisions.

### QA-11 — Room-scan celebration offers "Başka bir eşyaya bak" — **polish** · Visual
- After confirming a room scan, the secondary action still says "look at another item" and starts a Tek Eşya scan. `app/page.js:2154`.

### QA-12 — Back from a scan started inside a room goes Home — **minor** · UX
- **Steps:** Odalarım → room → "Odaya birlikte bakalım" → analysis → Back (header "Geri").
- **Expected:** back to that room.
- **Actual:** Home. The draft is kept and the room later shows "Yarım kalan bir tarama var" (good), but the user loses their place.
- **Likely source:** `app/page.js` `onBack={() => goTo('home')}` at 1156, 1166, 1242, 1265.

### QA-13 — Room decision list shows the category, not the item — **minor** · UX
- The room list shows "cam — Geri Dönüştür" instead of "boş cam şişe". With several similar items the list becomes ambiguous. Decisions store only `category`.

### QA-14 — Refresh returns to Home and silently drops unsaved AI work — **minor** · UX
- The current screen is not in the URL, so every reload lands on Home.
- A roomless Oda Taraması (before "Odaya Kaydet") and a Tek Eşya analysis (before saving) are lost on reload with no warning. Both are paid AI results. The `beforeunload` guard covers only a dirty in-room draft (`app/page.js:126–131`).

### QA-15 — Sestia chat is cleared on reload — **minor** · Confusing
- Known limitation (chat lives only in React state). There is a "Yeni sohbet" button, but reload also starts a new chat without saying so.

### QA-16 — Accessibility gaps — **polish** · UX
- Decision and room choice buttons have no `aria-pressed`; selection is shown only by a CSS class. Room icon buttons are named only by `title`.
- The Tek Eşya note field has only a placeholder, no label (`app/page.js:1793`).
- The feedback sheet has no `role="dialog"` and Esc doesn't close it (`components/FeedbackButton.js:49–50`).

### QA-17 — `/giris` shows the invite form to users who already have access — **minor** · Confusing
- Reached via QA-01. Could redirect to `/` when `access_ok` is valid. (Irrelevant once public email-only mode drops the invite code.)

### QA-18 — Question-heavy copy — **polish** · Visual (character)
- Keşif stacks "Aklına takılan bir şey var mı?" and "Etrafında değiştirmek istediğin bir şey var mı?" and ends with "Ne dersin?". Home shows "İlk olarak bir eşya seçmeye ne dersin?". This conflicts with the character rule that not every message ends in a question.

### QA-19 — Staging environment limits — **Env**
- Owner-only mode made guest flow, second-user isolation and email login untestable on staging (addressed by the agreed public email-only switch).
- From `docs/SESTIA_RAILWAY_TEST_YAYINI.md`: Resend delivery not yet verified; Railway volume backups not enabled (`Not Authorized`). Both matter before real users arrive.

### QA-20 — Foreign scan close returns 409 "update the app" instead of 404 — **polish** · Bug
- Guest B `DELETE /api/rooms/<A's room>/scan {}` → `409 client_upgrade_required` ("Uygulama güncellendi…"). Nothing leaks, but the response is misleading; the ownership check runs after the payload check (`app/api/rooms/[id]/scan/route.js`).

### QA-21 — Telemetry is very chatty — **polish** · Env
- About two `POST /api/event` per user action (more than 100 in a short session). Fine for SQLite now; worth batching before public traffic.

### Observations (not bugs)
- After the first onboarding, users land on the Keşif tab; later, Home. Probably intended for first-timers.
- The Tek Eşya suggestion is not pre-selected, so "Kararımı kaydet" stays disabled until the user taps a choice. Consistent with "a suggestion is not a decision".
- The camera input does have `capture="environment"` in source; desktop Chromium reports it as empty.

---

## 4. Auth boundaries and isolation (verified)

| Check | Result |
|---|---|
| Staging unauthenticated: `/`, `/hosgeldin`, `/giris`, `/admin` | `307 → /ozel-giris` ✅ |
| Staging unauthenticated API (GET and POST, 13 routes incl. analyze, decide, rooms, chat, feedback, access) | `401` ✅ |
| Forged `access_ok=1` cookie (local) | `401` ✅ |
| Tampered guest cookie (local) | `401` ✅ |
| Guest B reading A's room / photo | `404` ✅ |
| Guest B uploading to A's room | `404` ✅ |
| Guest B decision with A's `roomId` | saved as B's roomless decision; A's room unaffected ✅ |
| A's room list vs B's | fully separate ✅ |
| Path traversal in photo id | `400` ✅ |
| `/admin` without admin cookie (local) | `307 → /admin-giris` ✅ |
| Room creation with the same `operationKey` twice | same room returned (idempotent) ✅ |

---

## 5. Not tested in this pass
- Anything behind the staging gate (real production data paths, Railway disk, real Anthropic output, Resend delivery).
- 375px layout and screenshots (pane hidden).
- Browser restart / long-lived session expiry; two devices on one account.
- Admin panel content.
- Slow network / offline behavior.

---

## 6. Suggested order for the repair phase (after your review)
1. **Before going public:** QA-02 (rate limits: magic-link sends per email/IP, daily AI cap per user, code endpoints), QA-04 headers, QA-03 MIME sniffing, QA-05 error reporting on the login page.
2. **Major UX:** QA-01 Back navigation, QA-06 account screen.
3. **Minor bugs/UX:** QA-09, QA-07, QA-12, QA-14, QA-10, QA-13, QA-20.
4. **Polish:** QA-08, QA-11, QA-16, QA-18, QA-21.

## 7. Test run log (chronological)

| # | Step | Result |
|---|---|---|
| 1 | Repo inspection: git log, `package.json`, `tests/`, `docs/SESTIA_RAILWAY_TEST_YAYINI.md` | Staging is owner-only since `353cf9e`; no browser automation in the repo; 81 unit tests present |
| 2 | Staging GET probe of 14 routes, no cookies | App routes `307 → /ozel-giris`; APIs `401`; `/api/health` `{"ok":true}`; `/api/auth/session` `null` |
| 3 | Staging POST probe of 9 write routes | All `401 private_access_required` |
| 4 | Staging response headers | `noindex` + `no-store` present; security headers missing; `x-powered-by` present → QA-04; `/api/error` blocked → QA-05 |
| 5 | Staging `/ozel-giris` in the browser | Renders "Sana özel bir alan."; email field 16px (no iOS zoom); screenshot and 375px emulation failed (pane hidden) |
| 6 | `npm test` | 81/81 pass; real `data/app.db` fingerprint unchanged |
| 7 | Local isolated production build + `next start` on :3101 | Build succeeded |
| 8 | HTTP auth/isolation suite with two guest cookie jars | See §4; text file accepted as PNG → QA-03 |
| 9 | UI: `/hosgeldin` → "Hadi Başlayalım" → `/giris` | Wrong code `401` with "Kod yanlış görünüyor, tekrar dener misin?"; correct code → app |
| 10 | Name step with `<b>QA</b> Şükrü "İ"` | Rendered literally (escaped) ✅; copy mismatch → QA-08 |
| 11 | Method step (no Resend) → guest | Correct "E-posta ile giriş şu anda hazır değil" ✅; guest lands on the Keşif tab |
| 12 | Header "○" (Hesabım) | Onboarding reopens → QA-06; "isimsiz" path still greets by name → QA-07 |
| 13 | Tek Eşya with the fake AI key | "Analiz sırasında bir sorun oluştu. Aşağıdan öneriyi elle seçip devam edebilirsin." + manual choice ✅ |
| 14 | Tek Eşya with a replayed success | Banner "Öneri: Tut" + SESTIA card (idea + one question) + note field ✅ |
| 15 | Choose "Bağışla" → "Kararımı kaydet" | `POST /api/decide 200`; "Mobilya · Koltuk — Kararın: Bağışla" ✅; "Kaydıma dön" → Home → QA-10 |
| 16 | Odalarım empty state | "İlk odana yer aç." + create form ✅ |
| 17 | Roomless Oda Taraması, 2 photos, replayed analysis | Save panel shown, confirm disabled until saved ✅ |
| 18 | "Odaya Kaydet" to new room "QA Salon" → "Tümünü Onayla" | `POST /api/rooms` → scan → 2 photos → scan → `PUT` confirm, all `200` ✅; secondary button copy → QA-11 |
| 19 | "Kaydıma dön" → room detail | Photos load, history "3 eşya bulundu", decisions listed by category → QA-13 |
| 20 | Browser Back from room detail | Left the app to `/giris` → QA-01, QA-17 |
| 21 | 40 wrong invite codes, then the correct one | No throttling → QA-02 |
| 22 | Sestia chat with the fake key | "Yanıt alınamadı. Mesajın burada; tekrar gönderebilirsin." and draft kept ✅ |
| 23 | Chat resend + follow-up (replayed) | Roles `u` → `uau`, no stuck state ✅ |
| 24 | Reload | Guest, name and rooms kept ✅; chat cleared → QA-15; screen resets to Home → QA-14 |
| 25 | Keşif tab as a user with work | Duplicate fallback copy → QA-09; card "Bir köşenin başka bir hayatı" opens chat with context `kose` ✅ |
| 26 | 5th decision ("At") → "Bu haftanın kişisel fikirleri" | Button appears at 5 decisions ✅; fake key → "İpuçları yüklenemedi. Tekrar dener misin?" + retry ✅; bottom nav hidden on this screen |
| 27 | Feedback button | Empty submit disabled; send → "Gönderildi, teşekkürler!" ✅; no dialog role / Esc → QA-16 |
| 28 | In-room scan → Back without confirming | Went Home → QA-12; room shows "Yarım kalan bir tarama var" ✅ |
| 29 | "Taramaya Devam Et" → confirm | Draft restored, "Tümünü Onayla" enabled, decision saved, returns to room ✅ |
| 30 | Console and network review | No JS exceptions; only intentional 401/500s; about 2 telemetry calls per action → QA-21 |

**Totals:** 21 findings (2 major, 1 major UX, 11 minor, 7 polish/env) plus 3 observations. No blockers: every core flow completes end to end on the local production build.

## 8. Test data created
- **Staging:** none.
- **Local:** only in the temp copy's own database (`%TEMP%\sestia-qa-prod-*`), which is deleted with the temp folder. The real local `data/app.db` was not touched (fingerprint checked before and after `npm test`).
