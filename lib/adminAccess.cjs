// Who may open /admin. Pure (no Next.js imports) so proxy.js can use it.
//
// Owner mode: when ADMIN_OWNER_EMAIL is set (or the whole app is in
// PRIVATE_OWNER_EMAIL lockdown), /admin requires that verified account with
// an ACTIVE Session V2 account session — the same binding the private-owner
// path in proxy.js already enforces. The shared ADMIN_ACCESS_CODE is then
// refused entirely, so it can never weaken the owner-only path.
//
// Code mode (neither variable set): the legacy shared-code gate remains for
// aggregate pages only; per-account detail and timelines are not rendered.
function ownerEmail() {
  return (process.env.ADMIN_OWNER_EMAIL || process.env.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
}
function ownerMode() {
  return Boolean(ownerEmail());
}
function isOwnerEmail(email) {
  const owner = ownerEmail();
  return Boolean(owner) && typeof email === 'string' && email.trim().toLowerCase() === owner;
}
module.exports = { ownerEmail, ownerMode, isOwnerEmail };
