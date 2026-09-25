function privateOwner() {
  return (process.env.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
}
function isAllowedEmail(email) {
  const owner = privateOwner();
  return !owner || (typeof email === 'string' && email.trim().toLowerCase() === owner);
}
// Guests are refused and every tester signs in with their email (magic link).
// Owner-only mode implies it; EMAIL_LOGIN_REQUIRED=1 turns it on for the
// invite-code test group.
function emailRequired() {
  return Boolean(privateOwner()) || (process.env.EMAIL_LOGIN_REQUIRED || '').trim() === '1';
}
module.exports = { privateOwner, isAllowedEmail, emailRequired };
