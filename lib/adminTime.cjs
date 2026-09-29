// Admin-only display helpers. Pure and dependency-free so they are unit
// testable. Two timestamp formats live in this database: Session V2 tables
// store epoch milliseconds, product tables store SQLite datetime('now') text
// ('YYYY-MM-DD HH:MM:SS', always UTC, 1-second precision). Everything is
// normalized to epoch ms first and only rendered in Europe/Istanbul at the
// edge — never "interpreted as local time" by string slicing.

const ADMIN_TIME_ZONE = 'Europe/Istanbul';

// SQLite datetime('now') text is UTC but carries no zone marker; appending
// 'Z' makes Date.parse read it as UTC instead of the server's local zone.
function sqliteUtcToMs(text) {
  if (typeof text !== 'string' || !text) return null;
  const iso = text.includes('T') ? text : text.replace(' ', 'T');
  const ms = Date.parse(/(Z|[+-]\d\d:?\d\d)$/i.test(iso) ? iso : `${iso}Z`);
  return Number.isFinite(ms) ? ms : null;
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ADMIN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function istanbulParts(ms) {
  const parts = {};
  for (const p of partsFormatter.formatToParts(new Date(ms))) parts[p.type] = p.value;
  return parts;
}

// 'YYYY-MM-DD HH:mm' in Istanbul time; '—' for a missing value.
function formatIstanbul(ms) {
  if (!Number.isFinite(ms)) return '—';
  const p = istanbulParts(ms);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function formatIstanbulTime(ms) {
  if (!Number.isFinite(ms)) return '—';
  const p = istanbulParts(ms);
  return `${p.hour}:${p.minute}`;
}

// Calendar day in Istanbul ('YYYY-MM-DD') — daily buckets must follow the
// owner's day, not the UTC day.
function istanbulDayKey(ms) {
  const p = istanbulParts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

// Human-sized duration for approximate spans: '45 sn', '12 dk', '1 sa 05 dk'.
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} sn`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} dk`;
  const hours = Math.floor(totalMinutes / 60);
  return `${hours} sa ${String(totalMinutes % 60).padStart(2, '0')} dk`;
}

// List views never show a full address: first character of the local part,
// domain intact (the existing admin convention).
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

module.exports = { ADMIN_TIME_ZONE, sqliteUtcToMs, formatIstanbul, formatIstanbulTime, istanbulDayKey, formatDuration, maskEmail };
