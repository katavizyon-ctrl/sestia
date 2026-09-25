const crypto = require('node:crypto');

const MAX_AGE = { access: 180 * 86400, admin: 30 * 86400 };
function signature(payload) {
  if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET is required');
  return crypto.createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('hex');
}
function createAccessToken(scope) {
  if (!MAX_AGE[scope]) throw new Error('Invalid access scope');
  const payload = `${scope}.${Date.now() + MAX_AGE[scope] * 1000}.${crypto.randomBytes(16).toString('hex')}`;
  return `${payload}.${signature(payload)}`;
}
function verifyAccessToken(token, scope) {
  if (!MAX_AGE[scope] || typeof token !== 'string' || !process.env.AUTH_SECRET) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [kind, expiry, nonce, mac] = parts;
  if (kind !== scope || !/^\d+$/.test(expiry) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) return false;
  if (!Number.isSafeInteger(Number(expiry)) || Number(expiry) <= Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(parts.slice(0, 3).join('.')), 'hex'));
}
module.exports = { createAccessToken, verifyAccessToken };
