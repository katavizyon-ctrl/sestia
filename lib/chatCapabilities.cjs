// Single source of truth for "what can Sestia's conversation actually do
// right now" — read by (1) system-prompt construction, (2) validation of the
// model's own suggestedAction before it ever reaches the client, and (3) the
// client's own render check. The model is never the source of truth; this
// object is. Keep this list honest and small — a capability only belongs
// here once the UI action it names is real.
//
// Two different questions are deliberately kept separate:
//   - relevant: is this capability something Sestia may even mention right
//     now (a real, usable image/context exists for it)? Independent of who
//     is asking — a guest may see "Toparlanmış halini gör" too.
//   - requiresAccount: does actually USING it require an authenticated
//     account? This is an authorization fact, never decided by the model,
//     and never by the client alone either — the generation endpoint itself
//     enforces it server-side (see lib/identity.js:isAccountIdentity).
//
// attach_photo has no such distinction (always relevant, never account-
// gated), so it stays a plain boolean — no need to force every capability
// into the richer shape.
function getCapabilities(signals = {}) {
  return {
    attach_photo: true,
    view_tidied_room: {
      relevant: Boolean(signals.hasAttachableImage),
      requiresAccount: true,
    },
  };
}

// action: null | 'attach_photo' | { type: 'view_tidied_room', attachmentId }
// Structural + relevance validation only — this does NOT check account
// authorization (that's a separate, identity-aware check the route makes at
// the generation endpoint) and does NOT check that a targeted attachment id
// actually occurs in the conversation (also the route's job, since it needs
// the resolved message history this function doesn't have).
function isSuggestedActionValid(action, capabilities) {
  if (action === null || action === undefined) return true;
  if (action === 'attach_photo') return capabilities.attach_photo === true;
  if (action && typeof action === 'object' && action.type === 'view_tidied_room') {
    return Boolean(capabilities.view_tidied_room?.relevant) && Number.isInteger(action.attachmentId);
  }
  return false;
}

module.exports = { getCapabilities, isSuggestedActionValid };
