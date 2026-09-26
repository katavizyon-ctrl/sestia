// Pure, framework-agnostic composer logic shared by ConversationPanel — kept
// separate from the React component (same reason as roomScanClient.cjs) so
// the actual send/attachment guard rules are unit-testable without a DOM.
const SUPPORTED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MESSAGES = 41;
// Mirrors lib/chatCapabilities.cjs's V1 action set — the client's OWN
// defensive allowlist, checked in addition to (never instead of) server-side
// validation, so an unrecognized action can never render a button. Two
// shapes: a bare string (no parameters) and a typed object (carries the
// exact target the action applies to — never "whichever is most recent").
const ALLOWED_SUGGESTED_ACTIONS = ['attach_photo'];
const ALLOWED_TYPED_ACTIONS = ['view_tidied_room'];

// Do not silently send just because a file was selected — send is a
// distinct, explicit action (text, image, or both).
function canSend({ text, file, busy, messageCount }) {
  if (busy) return false;
  if (messageCount >= MAX_MESSAGES) return false;
  return Boolean((text && text.trim()) || file);
}

function isSupportedAttachment(file, maxBytes) {
  if (!file) return false;
  if (!SUPPORTED_ATTACHMENT_TYPES.includes(file.type)) return false;
  if (typeof maxBytes === 'number' && file.size > maxBytes) return false;
  return true;
}

// content may be '' for an image-only message — never a placeholder string
// invented client-side (the server supplies its own minimal instruction text
// when needed, see lib/anthropic.js).
function buildUserMessage(text, imageRef) {
  const content = (text || '').trim();
  return imageRef ? { role: 'user', content, image: imageRef } : { role: 'user', content };
}

function isRenderableAction(action) {
  if (typeof action === 'string') return ALLOWED_SUGGESTED_ACTIONS.includes(action);
  return Boolean(action) && typeof action === 'object' && ALLOWED_TYPED_ACTIONS.includes(action.type) && Number.isInteger(action.attachmentId);
}

module.exports = {
  SUPPORTED_ATTACHMENT_TYPES,
  MAX_MESSAGES,
  ALLOWED_SUGGESTED_ACTIONS,
  ALLOWED_TYPED_ACTIONS,
  canSend,
  isSupportedAttachment,
  buildUserMessage,
  isRenderableAction,
};
