function privateOwner() {
  return (process.env.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
}
function isAllowedEmail(email) {
  const owner = privateOwner();
  return !owner || (typeof email === 'string' && email.trim().toLowerCase() === owner);
}
module.exports = { privateOwner, isAllowedEmail };
