// Brute-force guard for the shared invite/admin codes (QA-02).
// In-memory and per process: staging runs a single Railway replica, and a
// restart only resets the counters — acceptable for a small test group.
const crypto = require('node:crypto');

function createAttemptLimiter({ maxPerClient = 8, maxGlobal = 60, windowMs = 15 * 60 * 1000 } = {}) {
  const clients = new Map();
  let global = { start: 0, count: 0 };

  function current(bucket, now) {
    return bucket && now - bucket.start < windowMs ? bucket : null;
  }

  return {
    // Seconds until another attempt is allowed, or 0 when not blocked.
    blockedFor(key, now = Date.now()) {
      const client = current(clients.get(key), now);
      if (client && client.count >= maxPerClient) return Math.ceil((client.start + windowMs - now) / 1000);
      const all = current(global, now);
      if (all && all.count >= maxGlobal) return Math.ceil((all.start + windowMs - now) / 1000);
      return 0;
    },
    fail(key, now = Date.now()) {
      const client = current(clients.get(key), now) || { start: now, count: 0 };
      client.count += 1;
      clients.set(key, client);
      if (!current(global, now)) global = { start: now, count: 0 };
      global.count += 1;
      if (clients.size > 5000) {
        for (const [k, b] of clients) if (!current(b, now)) clients.delete(k);
      }
    },
    succeed(key) {
      clients.delete(key);
    },
  };
}

// Railway's edge appends the connecting address last; take the last hop so a
// client-supplied X-Forwarded-For value cannot be used to rotate identities.
function clientKey(headers) {
  const forwarded = (headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return forwarded[forwarded.length - 1] || headers.get('x-real-ip') || 'unknown';
}

// Constant-time comparison of two strings of any length.
function codesMatch(given, expected) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createAttemptLimiter, clientKey, codesMatch };
