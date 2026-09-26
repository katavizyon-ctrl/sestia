# SESTIA — Conversation → Toparla + Account Gate V1
## Final Implementation Report

Branch: `codex/sestia-functional-design`
HEAD at time of implementation and at time of this report: `9b983f192903c13d02143833b0e66dc220e4c0a8`
Status: implemented and verified locally. **Not committed.**

---

## 1. Architecture implemented

Toparla ("Toparlanmış halini gör") is now an **account-only capability**, enforced **server-side** at every entry point, while remaining conversationally visible to guests (a guest may still see and tap the action — it opens an account gate rather than a paid call). This required three architectural moves, built additively on top of the already-shipped Conversation Layer V1 and the already-shipped room-based Toparla feature:

1. **Source generalization.** The existing `toparla_results` persistence (claim-before-paid-call discipline, `UNIQUE(device_id, operation_key)` idempotency, private result storage/serving, and the underlying `lib/openaiImage.cjs` generation core) was generalized to accept a source that is either a `room_photo` (unchanged, original behavior) or a `chat_attachment` (new — a photo shared conversationally with no room involved). This was done additively: the existing room-based claim function, its route, and its full test suite are untouched.
2. **Account gate.** A single, reusable authorization primitive (`isAccountIdentity`, built on the identity system's pre-existing `type` field) is now checked, server-side, before any paid call — at **both** the existing room-based route and the new chat-originated route. Client-side, both surfaces render the same account-gate experience for a guest instead of the generation confirmation.
3. **Exact-image targeting.** Because a conversation can contain more than one shared image, the model's structured suggestion for "show the tidied version" must name the exact image it means — not "whichever was most recent." Every image shown to the model is tagged with a reference id it must cite back; the server independently verifies that id actually occurred in the validated conversation and belongs to the requesting identity before ever trusting it.

The result: `Conversation → Feature → Conversation` is now real for Toparla specifically — a conversation about a room photo can surface "Toparlanmış halini gör" as a genuine, working action (subject to the account requirement), generate inline, and the Before/After result renders directly in the same conversation surface without navigating away.

---

## 2. Exact files changed

**Modified (12):**
- `app/api/rooms/[id]/toparla/route.js` — account gate added (5 lines).
- `app/api/sestia-chat/route.js` — capability-signal computation, exact-attachment validation of `suggestedAction`.
- `app/page.js` — `startToparlaInRoom` account branch, new `account-gate` `ToparlaView` status, `requireAccountFlow` helper, `BeforeAfterSlider` import (moved out), prop wiring for `identityType`/`onRequireAccount`.
- `components/SestiaExperience.js` — `BeforeAfterSlider` moved here (exported, shared); `ConversationPanel` gained the inline Toparla widget (`openToparlaFlow`/`confirmToparlaFlow`/`dismissToparlaFlow`/`retryToparlaFlow`), `identityType`/`onRequireAccount` props; `SestiaChat` forwards both.
- `lib/anthropic.js` — `chatFreely` rewritten to: accept the richer capability shape, tag each image with a reference id, build a dynamic actions schema, and normalize a typed `suggestedAction` (`{type,attachmentId}`) alongside the existing bare-string form.
- `lib/chatCapabilities.cjs` — `view_tidied_room` capability now `{relevant, requiresAccount}` instead of a plain boolean; `isSuggestedActionValid` handles both string and typed-object actions.
- `lib/chatComposerClient.cjs` — `isRenderableAction` extended for the typed `view_tidied_room` shape; new `ALLOWED_TYPED_ACTIONS` export.
- `lib/chatContext.cjs` — `resolveContext`'s `toparla_result` branch and `buildContextSystemText` both gained a room-less branch (a result can now legitimately have `roomId: null`).
- `lib/db.js` — `chatAttachments` store construction moved before `toparla` so its `getOwned` function can be injected as a dependency; `toparla` now receives `{getOwnedAttachment}`.
- `lib/identity.js` — new `isAccountIdentity(identity)` helper (one-line wrapper around the pre-existing `identity.type === 'account'` field).
- `lib/toparlaStore.cjs` — additive schema migration, new `claimGenerationFromAttachment`, `toPublic`/`getResult` widened for the new columns. The original `claimGeneration` function is byte-for-byte unchanged in behavior.
- `tests/toparla.test.cjs` — fixture's fake identity now carries a `type`; one new guest-rejection test.

**New (2):**
- `app/api/chat/toparla/route.js` (POST — chat-attachment-originated generation).
- `app/api/chat/toparla/[resultId]/route.js` (GET — room-less private result serving).

**New/updated tests (6):**
- `tests/chat-toparla-route.test.cjs` (new — 8 tests).
- `tests/chat-capabilities.test.cjs`, `tests/chat-composer-client.test.cjs`, `tests/chat-context.test.cjs`, `tests/chat-multimodal.test.cjs`, `tests/sestia-chat-route.test.cjs` (each extended with new cases; no existing assertion weakened or removed).

**Explicitly untouched:** `lib/openaiImage.cjs` (model/prompt/quality/size logic), the existing room-based `claimGeneration` function's signature and behavior, `tests/toparla.test.cjs`'s existing assertions (only the fixture's identity shape and one new test were added).

---

## 3. Exact schema changes

`toparla_results` gained, additively:
- `source_kind TEXT NOT NULL DEFAULT 'room_photo'`
- `chat_attachment_id INTEGER REFERENCES chat_attachments(id)` (nullable)
- `room_id` — was `INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE`, is now nullable (constraint relaxed).
- `source_photo_id` — was `INTEGER NOT NULL REFERENCES room_photos(id)`, is now nullable (constraint relaxed).

**Migration mechanism:** SQLite has no `ALTER COLUMN`, so relaxing a `NOT NULL` constraint requires the standard rename → recreate → copy → drop sequence. This is implemented in `lib/toparlaStore.cjs`, guarded by a `PRAGMA table_info` check (only runs if the old shape is detected), wrapped in a single transaction, and is idempotent (a no-op on a fresh database, which is created with the new shape directly, and a no-op on an already-migrated database).

**Verification performed:** a standalone script built an in-memory database with the exact pre-existing (currently-deployed) schema, inserted a representative completed row, then ran the real migration code against it. Result: the row survived unchanged in every original field, with `source_kind` correctly backfilled to `'room_photo'` and `chat_attachment_id` correctly `NULL`. `room_id`/`source_photo_id` confirmed nullable afterward (`PRAGMA table_info` → `notnull: 0`); all other NOT NULL columns (`device_id`, `source_kind`, `operation_key`, `status`, timestamps) confirmed still enforced. No other table changed.

---

## 4. Account-gate implementation

`lib/identity.js`:
```js
export function isAccountIdentity(identity) {
  return identity?.type === 'account';
}
```
This is not a new authorization system — `getIdentity()` already returned `{id, type: 'account'|'guest'}` for every route; the only prior gap was that no route ever checked `type` for anything. This helper is now called at the very top of both generation routes, before any DB row is touched:

```js
const identity = await getIdentity();
if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
if (!isAccountIdentity(identity)) return NextResponse.json({ error: 'account_required' }, { status: 403 });
```

A guest identity never reaches the claim/idempotency layer, never creates a `toparla_results` row, and never reaches `openaiImage.generateTidyImage` — verified by dedicated tests asserting the mocked generation function's call count stays at zero and the results table stays empty after a rejected guest request.

---

## 5. Existing Room Detail Toparla authorization change

Minimal, isolated diff — nothing else in the file changed:

```diff
-import { getIdentity } from '@/lib/identity';
+import { getIdentity, isAccountIdentity } from '@/lib/identity';
...
   if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
+  if (!isAccountIdentity(identity)) return NextResponse.json({ error: 'account_required' }, { status: 403 });
```

Client-side (`app/page.js:startToparlaInRoom`): a guest is routed directly to a new `'account-gate'` `ToparlaView` status — photo selection is skipped entirely (there is no point selecting a source photo for a generation the identity cannot authorize). An account proceeds through the exact, unmodified existing flow: zero-photo notice → single-photo auto-select or multi-photo picker → confirm → generate → Before/After → error/no-auto-retry, all byte-for-byte as before.

---

## 6. chat_attachment → Toparla server flow

`POST /api/chat/toparla` (`{attachmentId, operationKey}`):
1. `getIdentity()` → 401 if none.
2. `isAccountIdentity()` → 403 `account_required` if guest. **This check happens before the attachment is even looked up.**
3. Validate `attachmentId` is an integer, `operationKey` matches the existing `/^[A-Za-z0-9-]{8,100}$/` pattern.
4. `toparla.claimGenerationFromAttachment(deviceId, attachmentId, operationKey, {model, quality})` — ownership-checked via the injected `chatAttachments.getOwned` (single-factor, since a chat attachment has no room); same `UNIQUE(device_id, operation_key)` claim-before-call discipline as the room-based sibling.
5. Not found / owned by someone else → 404. Same key reused for a different attachment (or crossed with a room-photo claim) → 409 `operation_content_conflict`. Already pending → 409 `already_in_progress`. Already completed/failed → replay the stored result, **zero additional provider calls**.
6. On a genuinely new claim: read bytes from `data/chat-attachments/`, compute size via the unchanged `openaiImage.pickOutputSize`, call the unchanged `openaiImage.generateTidyImage` (same model, same prompt, same quality), write the result to `data/toparla-results/`, finalize the row as `completed` or `failed`.

`GET /api/chat/toparla/[resultId]` — room-less private serving. The existing room-based GET route already ignored its own `[id]` (roomId) path segment (`getResultFile` is keyed on `resultId + device_id` alone), so this new route is the natural room-agnostic equivalent of an already-existing pattern, not a new one. Ownership check identical in shape: device_id mismatch or not-yet-completed → 404, filesystem never touched.

No room is ever created. No `room_photos` row is ever inserted. Verified by direct code grep (no `createRoom`/`addRoomPhoto`/`INSERT INTO room_photos` anywhere in the new files) and by a dedicated test asserting `rooms`/`room_photos` counts stay at zero after a successful chat-originated generation.

---

## 7. Exact-image structured-action targeting

**Problem:** a conversation may contain more than one shared image (the validated real staging scenario: an inspiration reference image shared first, the user's own room shared second). "Most recent image wins" was explicitly rejected as unsafe.

**Mechanism:**
- In `lib/anthropic.js:chatFreely`, every user message carrying a resolved image is preceded, in the Anthropic content array, by a text block `[Fotoğraf referansı: N]` where `N` is the real `chat_attachments.id` for that image.
- The system prompt instructs: *"view_tidied_room önerirken attachmentId alanına, tam olarak hakkında konuştuğun fotoğrafın yanındaki '[Fotoğraf referansı: N]' etiketindeki sayıyı yaz — birden fazla fotoğraf paylaşılmışsa en sonuncuyu değil, GERÇEKTEN kastettiğini; asla uydurma, asla başka bir fotoğrafın numarasını kullanma."*
- The model's structured output for this action is `{"type":"view_tidied_room","attachmentId":N}` (a typed object, distinct from the bare-string `"attach_photo"` shape).
- `lib/anthropic.js` performs lightweight shape normalization only (rejects non-integer/missing ids to `null`) — **not** the trust boundary.
- `app/api/sestia-chat/route.js` computes the actual set of attachment ids that occurred in **this validated, ownership-checked conversation** (`resolvedMessages.filter(...).map(m => m.image.id)`) and only forwards the model's `suggestedAction` to the client if the named `attachmentId` is a member of that set. A name that never occurred, or that belongs to a different identity's attachment, is **stripped, never substituted with any other image.**

**Tested explicitly against the real scenario:** attachment A (inspiration) shared, then attachment B (user's room) shared, model targets B by id — verified the response targets B, and that A is never substituted. Separate tests cover: an invented/foreign id being stripped, and the action being unavailable at all when no image was ever shared.

---

## 8. Capability-truth implementation

`lib/chatCapabilities.cjs`:
```js
function getCapabilities(signals = {}) {
  return {
    attach_photo: true,
    view_tidied_room: { relevant: Boolean(signals.hasAttachableImage), requiresAccount: true },
  };
}
```
Two questions are deliberately kept separate, per the locked product decision:
- **`relevant`** — is this capability something Sestia may even mention right now? Computed purely from "does this conversation have an owned, usable image" — **independent of identity type**. A guest is told the truth; the capability is not hidden from them.
- **`requiresAccount`** — an authorization fact, never decided by the model, and validated only at the generation endpoint (§4–6), never here.

`isSuggestedActionValid(action, capabilities)` validates relevance and shape only — it deliberately does **not** check account status, because a guest is allowed to receive/render this suggestion (that's the whole point of "show the gate, don't hide the feature"). The one place account status actually gates anything is the generation route itself.

Client-side (`lib/chatComposerClient.cjs:isRenderableAction`) independently re-validates the shape (string or `{type,attachmentId}`) before rendering any button — defense in depth, never the sole check, and it cannot make an unavailable capability available (it can only refuse to render something the server already returned).

---

## 9. Guest UI behavior

A guest sees "Toparlanmış halini gör" exactly as an account holder would — same suggestion, same relevance, same placement (inline in the conversation, or as the existing button in Room Detail). Tapping it, from either surface, opens:

> **Bunu senin için oluşturabilmem için giriş yapman gerekiyor.**
> [E-posta ile devam et]  [Şimdilik değil]

No operation key is minted. No request is sent to any generation endpoint. No `toparla_results` row is created. "E-posta ile devam et" calls one shared `requireAccountFlow()` (`app/page.js`) that reuses the pre-existing `WelcomeView` / `accountEmailFlow` mechanism — **no second login/signup implementation was built.** "Şimdilik değil" dismisses the gate (Room Detail: back to the room; chat: the inline gate card closes) with zero side effects.

---

## 10. Account UI behavior

**Room Detail:** entirely unchanged from before this task — zero-photo notice, single/multi-photo selection, confirm, generate, Before/After, error/retry — now simply reached only after the (invisible-to-them) account check passes.

**Chat:** tapping the suggestion opens an **inline** card directly in the message log — the frozen source image preview, the locked "tidy ≠ redesign" copy, and **"Toparlanmış halini oluştur"** as the only button that can trigger the paid call, plus a "Vazgeç" dismiss. No navigation away from the conversation, no second photo picker, no upload.

---

## 11. Confirmation → generation → Before/After flow

Identical sequencing to the room-based flow, rendered inline instead of on a separate screen: confirm card → explicit tap on "Toparlanmış halini oluştur" → generating spinner ("Odanı toparlanmış haliyle görüyoruz…") → the same `BeforeAfterSlider` component (moved into `components/SestiaExperience.js` and now imported by both the Room Detail screen and the chat surface — **one slider implementation, not two**) → the conversation continues immediately below it, unbroken. Failure renders an inline error card with an explicit "Tekrar dene" (never automatic).

---

## 12. Idempotency/race/cost protections

- **Server:** identical `UNIQUE(device_id, operation_key)` claim-before-any-paid-call discipline as the original room-based implementation. Same operation key reused for a different attachment, or crossed between a room-photo claim and an attachment claim, is rejected (409) rather than silently regenerating or reporting the wrong source. A failed generation is recorded and **never** automatically retried — a fresh explicit user tap is required, which mints a fresh operation key.
- **Client:** the target `attachmentId` is frozen the instant the confirm card opens and is never re-derived from a later message or a newer `suggestedAction` — attaching a new image mid-flow updates the *next* turn's suggestion state but cannot mutate an already-open confirmation's target. A local `toparlaRequestRef` token, invalidated by "Yeni sohbet" or component unmount, ensures a late-arriving response can never update a conversation the user has already reset or left. A `pending` flag on the operation object, checked synchronously before any `await`, blocks a double-tap even faster than a re-render could disable the button.

---

## 13. Privacy behavior

- No chat transcript persistence (unchanged from the prior Conversation Layer V1 — still explicitly out of scope).
- No new analytics/telemetry event types were added.
- No room is ever silently created; no chat attachment is ever inserted into `room_photos` — verified by direct code grep across every new file and by a dedicated test asserting `rooms`/`room_photos` row counts stay at zero after a successful chat-originated generation.
- All new storage (`data/chat-attachments/`, and reuse of the existing `data/toparla-results/`) remains under `data/`, never `public/`.
- `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` confirmed absent from every file under the built `.next/static/` client bundle output.

---

## 14. Accepted guest→account limitation

Per the explicit, locked product decision: **no** ownership-transfer mechanism, **no** `pending_attachment_transfer` table, **no** `localStorage` resume-intent flag were built. The pre-existing email-verification flow completes via a hard `window.location.assign(...)` browser navigation, which unconditionally wipes all React conversation state (this was true before this task and remains true). A guest who authenticates via the account gate must re-share the photo and restate their intent afterward. This is documented as an explicit V1 limitation, not solved indirectly.

---

## 15. Accepted refresh limitation

A room-less, chat-originated Toparla result has no rediscovery surface after a browser refresh — no transcript, no "Recent Visualizations" list, no hidden room, no auto-save. The generated file remains private, safely stored, and ownership-protected on disk/DB regardless; it is simply not reachable from the UI again until the same conversation happens again. Explicit, accepted V1 limitation, as directed — not solved with any of the mechanisms explicitly ruled out.

---

## 16. Exact tests added/changed

20 new test cases across 6 files (0 existing assertions weakened or removed):

- **`tests/chat-toparla-route.test.cjs`** (new, 8 tests): guest rejection before any claim/paid call; foreign-attachment ownership rejection; happy path with room-less/photo-less/`chat_attachment`-typed row and zero `room_photos`/`rooms` writes; duplicate-submission replay with no second paid call; same key reused for a different attachment rejected; same key crossed between a room-photo claim and an attachment claim rejected; failed generation recorded with no auto-retry; result served only to the owner via the room-less serving route.
- **`tests/toparla.test.cjs`** (+1): guest identity rejected before any claim/paid call for the existing room-based route, even for a room/photo it legitimately owns.
- **`tests/chat-capabilities.test.cjs`** (+2): `view_tidied_room` correctly separates `relevant` from `requiresAccount`; `isSuggestedActionValid` requires relevance and a real integer `attachmentId`, never account status.
- **`tests/chat-composer-client.test.cjs`** (+1): `isRenderableAction` for the typed `view_tidied_room` shape (rejects missing/non-integer ids and unknown types).
- **`tests/chat-context.test.cjs`** (+2): a room-less completed result resolves without a false `room_not_found`; the room-less system-prompt framing carries the visualization language without inventing a room name.
- **`tests/chat-multimodal.test.cjs`** (+3): each attached image is tagged with its own reference id and the model's citation is captured correctly; `view_tidied_room` is only offered in the schema when the capability says it's relevant; a non-integer/missing `attachmentId` normalizes to `null`.
- **`tests/sestia-chat-route.test.cjs`** (+3, the critical scenario coverage): the exact real-world A/B-attachment targeting scenario (B is targeted, A is never substituted); an invented/foreign attachment id is stripped; the action is unavailable with no image in the conversation at all.

---

## 17. Exact final test counts

**199/199 passing, 0 failures** (179 before this task + 20 new). This includes, verified explicitly in this pass: all 9 internal checks of the guest-onboarding regression test, and the full pre-existing Toparla test suite (now 7 tests, all passing unmodified in their original assertions plus the one new guest-rejection case).

---

## 18. Build/security verification

- `npm run build`: clean, no errors or warnings. Route table includes `/api/chat/attachments`, `/api/chat/attachments/[attachmentId]`, `/api/chat/toparla`, `/api/chat/toparla/[resultId]`, alongside every pre-existing route including the now-gated `/api/rooms/[id]/toparla`.
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`: absent from every file under `.next/static/` (grepped directly against the built output).
- Full SQLite schema after migration inspected directly: exactly the pre-existing table set plus `chat_attachments` (from the prior task) — no new transcript/conversation table, no unexpected table.
- No code path in any new file writes to `room_photos` or calls `createRoom`/`addRoomPhoto` (grepped directly).
- The manual browser-fixture bundle (`tests/guest-onboarding-browser.cjs`), which exercises the real `components/SestiaExperience.js` in an actual browser DOM, still compiles cleanly against the modified component file.

---

## 19. Exact git status

```
 M app/api/rooms/[id]/toparla/route.js
 M app/api/sestia-chat/route.js
 M app/page.js
 M components/SestiaExperience.js
 D "design-references/ChatGPT Image Sep 22, 2026, 07_13_59 PM.png"
 M lib/anthropic.js
 M lib/chatCapabilities.cjs
 M lib/chatComposerClient.cjs
 M lib/chatContext.cjs
 M lib/db.js
 M lib/identity.js
 M lib/toparlaStore.cjs
 M tests/chat-capabilities.test.cjs
 M tests/chat-composer-client.test.cjs
 M tests/chat-context.test.cjs
 M tests/chat-multimodal.test.cjs
 M tests/sestia-chat-route.test.cjs
 M tests/toparla.test.cjs
?? app/api/chat/toparla/
?? tests/chat-toparla-route.test.cjs
?? toparla-benchmark-15.png
```

The pre-existing deleted design-reference PNG remains exactly as it was (unstaged deletion, untouched by this task). `toparla-benchmark-15.png` remains untracked and untouched. HEAD remains `9b983f192903c13d02143833b0e66dc220e4c0a8`. **Nothing has been committed.**

---

## 20. Genuine remaining risks

1. **No live browser click-through was performed.** This project has no jsdom/headless-browser automated test runner (the same limitation noted in the prior Conversation Layer V1 report) — the inline confirm/generating/done/error/account-gate UI is covered by extensive server-route and pure-logic tests, and the real client bundle is confirmed to compile, but the actual rendered interaction has not been visually verified end-to-end by this session.
2. **Model reliability on exact targeting.** The server independently verifies that any `attachmentId` the model names actually occurred in the conversation and belongs to the identity — this closes the *security/correctness* gap entirely (a wrong id is stripped, never substituted). It does not, and cannot, guarantee the model always *picks the conversationally correct* image among several when a user's intent is ambiguous — an inherent LLM-judgment surface, not a code defect.
3. **The guest→account reset (§14) is a hard product tradeoff**, accepted explicitly for V1. It should be revisited once guest→account continuity is addressed for the product as a whole, not patched narrowly for Toparla alone.

---

## Explicit confirmations

- **Live AI/provider call:** none occurred. Every Anthropic and OpenAI interaction in this task's tests was mocked at the boundary (`openaiImage.generateTidyImage`, `chatFreely`'s underlying `Anthropic.messages.create`).
- **Paid generation:** none occurred.
- **Production environment:** not touched.
- **Railway variables:** not touched.
- **Commit:** none was created. Working tree remains exactly as shown in §19.
