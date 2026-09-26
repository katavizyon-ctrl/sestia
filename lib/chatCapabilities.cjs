// Single source of truth for "what can Sestia's conversation actually do
// right now" — read by (1) system-prompt construction, (2) validation of the
// model's own suggestedAction before it ever reaches the client, and (3) the
// client's own render check. The model is never the source of truth; this
// object is. Keep this list honest and small — a capability only belongs
// here once the UI action it names is real.
const CAPABILITIES = {
  attach_photo: true,
};

function getCapabilities() {
  return { ...CAPABILITIES };
}

// null is always a valid "no action" response. Anything else must be a key
// that is currently true in the capability object — never trust a string
// merely because the model produced it.
function isSuggestedActionValid(action, capabilities = getCapabilities()) {
  if (action === null || action === undefined) return true;
  return typeof action === 'string' && capabilities[action] === true;
}

module.exports = { getCapabilities, isSuggestedActionValid };
