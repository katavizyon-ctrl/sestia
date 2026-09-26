// Explicit, narrow product-context model for Sestia's conversation.
// A client may only ever ASSERT a kind + the id(s) that kind needs; every id
// is re-verified against real ownership here, every single turn (never
// trusted merely because it was sent — see AGENTS/audit §H). Free-text
// context from the client is never accepted; only this closed shape is.
//
// DB-agnostic on purpose: callers inject the lookups they need so this stays
// testable with a fake store, exactly like the rest of this codebase's
// factory-style modules.

const KINDS = ['general', 'room', 'toparla_result'];

// Structural validation only — no DB access, no trust decisions yet.
function validContextShape(raw) {
  if (raw === null || raw === undefined) return true; // absent = general
  if (typeof raw !== 'object' || Array.isArray(raw)) return false;
  if (!KINDS.includes(raw.kind)) return false;
  const keys = Object.keys(raw);
  if (raw.kind === 'general') return keys.every((k) => k === 'kind');
  if (raw.kind === 'room') {
    return keys.every((k) => k === 'kind' || k === 'roomId') && Number.isInteger(raw.roomId);
  }
  if (raw.kind === 'toparla_result') {
    // roomId/sourcePhotoId are intentionally NOT accepted here even if the
    // client sends them: they are derived from the resolved result row
    // below, never taken independently, so they can never be spoofed to
    // point at a different room/photo than the one the result actually
    // belongs to.
    return keys.every((k) => k === 'kind' || k === 'toparlaResultId') && Number.isInteger(raw.toparlaResultId);
  }
  return false;
}

// deps: { ownsRoom(roomId, deviceId), getRoomName(roomId, deviceId), getToparlaResult(id, deviceId) }
// Returns { ok:true, resolved } or { ok:false, error }.
function resolveContext(raw, deviceId, deps) {
  if (!validContextShape(raw)) return { ok: false, error: 'invalid_context' };
  const context = raw || { kind: 'general' };

  if (context.kind === 'general') {
    return { ok: true, resolved: { kind: 'general' } };
  }

  if (context.kind === 'room') {
    if (!deps.ownsRoom(context.roomId, deviceId)) return { ok: false, error: 'room_not_found' };
    const roomName = deps.getRoomName(context.roomId, deviceId);
    return { ok: true, resolved: { kind: 'room', roomId: context.roomId, roomName } };
  }

  // toparla_result: the ONLY client-trusted input is the result id. Room and
  // source photo are derived from that row, not accepted independently.
  const result = deps.getToparlaResult(context.toparlaResultId, deviceId);
  if (!result || result.status !== 'completed') return { ok: false, error: 'result_not_found' };

  // A result can legitimately have no room at all (source_kind ===
  // 'chat_attachment' — shared conversationally, never saved to a room).
  // Only look up a room name when the result actually has a room_id; a null
  // roomId is a valid, different case, not "the room was deleted" (that
  // defensive check still applies only when a room_id is actually present).
  let roomName = null;
  if (result.roomId != null) {
    roomName = deps.getRoomName(result.roomId, deviceId);
    if (roomName == null) return { ok: false, error: 'room_not_found' }; // room deleted after the result was made
  }
  return {
    ok: true,
    resolved: {
      kind: 'toparla_result',
      roomId: result.roomId,
      sourcePhotoId: result.sourcePhotoId,
      chatAttachmentId: result.chatAttachmentId,
      toparlaResultId: result.id,
      roomName,
    },
  };
}

// A short, factual Turkish sentence for the system prompt — never the raw
// client object, never free prose. Deliberately says "this is a
// visualization" for the toparla_result case so the model doesn't need a
// giant prompt rule to remember it every time.
function buildContextSystemText(resolved) {
  if (!resolved || resolved.kind === 'general') return '';
  if (resolved.kind === 'room') {
    return `BAĞLAM: Kullanıcı şu anda "${resolved.roomName}" adlı odasına bakıyor. Bu bilgiyi doğal şekilde kullanabilirsin, tekrar sorma.`;
  }
  const subject = resolved.roomName ? `"${resolved.roomName}" odasının` : 'az önce paylaştığı fotoğrafın';
  return `BAĞLAM: Kullanıcı, ${subject} az önce üretilmiş toparlanmış hâlinin görselini inceliyor ve bu görsel hakkında konuşuyor. Bu bir görselleştirme — eşyaların gerçekte nereye taşındığının kaydı değil. Kullanıcı "masadaki kutular", "sağdaki köşe" gibi ifadelerle doğrudan bu görsele atıfta bulunabilir; hangi görselden bahsettiğini tekrar sormana gerek yok.`;
}

module.exports = { KINDS, validContextShape, resolveContext, buildContextSystemText };
