function privateOwner() {
  return (process.env.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
}
function isAllowedEmail(email) {
  const owner = privateOwner();
  return !owner || (typeof email === 'string' && email.trim().toLowerCase() === owner);
}
// Guests are refused and only the owner signs in with their email. Only the
// owner-only lockdown does this: using SESTIA must never require an email, so
// the former EMAIL_LOGIN_REQUIRED switch is intentionally ignored.
function emailRequired() {
  return Boolean(privateOwner());
}
module.exports = { privateOwner, isAllowedEmail, emailRequired };
