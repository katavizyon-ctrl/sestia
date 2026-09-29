// Shared, server-rendered pieces of the admin pages. No hooks, no client JS.
import adminTime from '@/lib/adminTime.cjs';

const { formatIstanbul, formatIstanbulTime, istanbulDayKey, formatDuration } = adminTime;
export { formatIstanbul, formatIstanbulTime, istanbulDayKey, formatDuration };

export const REC_LABELS = { tut: 'Tut', sat: 'Sat', bagisla: 'Bağışla', geri_donustur: 'Geri Dönüştür', at: 'At' };
export const SESSION_STATUS_LABELS = {
  active: 'Aktif', expired: 'Zaman aşımı (hesaplanan)', idle: 'Zaman aşımı', logout: 'Çıkış',
  replaced: 'Yeni oturumla değişti', policy: 'Politika değişikliği',
};
const SCAN_STATUS_LABELS = { confirmed: 'onaylandı', closed: 'onaylanmadan kapandı', open: 'açık' };
const TOPARLA_STATUS_LABELS = { completed: 'tamamlandı', failed: 'başarısız', pending: 'bekliyor' };

// The app's button classes are full-width, 52px-tall calls to action; admin
// filters and toggles need the compact, inline version of the same look.
export function pill(size = 'md') {
  return { width: 'auto', minHeight: 0, display: 'inline-flex', textDecoration: 'none', borderRadius: 999, lineHeight: 1.3,
    padding: size === 'sm' ? '3px 10px' : '6px 14px', fontSize: size === 'sm' ? 12 : 13 };
}

export const TEST_MODES = [
  { key: 'exclude', label: 'İç/Test hariç' },
  { key: 'include', label: 'İç/Test dahil' },
  { key: 'only', label: 'Sadece İç/Test' },
];

// Builds an admin href, dropping default-valued params.
export function adminHref(path, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && !(k === 'test' && v === 'exclude') && !(k === 'tur' && v === 'all')) q.set(k, v);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

const NAV = [
  { key: 'overview', href: '/admin', label: 'Genel Bakış' },
  { key: 'accounts', href: '/admin/hesaplar', label: 'Hesaplar' },
  { key: 'sessions', href: '/admin/oturumlar', label: 'Oturumlar' },
];

export function AdminShell({ title, active, testMode, testModePath, testModeParams = {}, access, children }) {
  return (
    <div className="sestia-admin"><div className="sestia-wordmark">SESTIA</div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600 }}>{title}</h1>
      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {NAV.map((n) => (
          <a key={n.key} href={adminHref(n.href, { test: testMode })} className={active === n.key ? 'btn-primary' : 'btn-outline'}
            style={pill()}>{n.label}</a>
        ))}
      </nav>
      {testModePath && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 12 }}>İç/Test trafiği:</span>
          {TEST_MODES.map((m) => (
            <a key={m.key} href={adminHref(testModePath, { ...testModeParams, test: m.key })}
              className={testMode === m.key ? 'btn-primary' : 'btn-outline'}
              style={pill('sm')}>{m.label}</a>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Saatler İstanbul saatiyle gösterilir. Konumlar IP&apos;den türetilen yaklaşık tahminlerdir.
        {access?.mode === 'code' && ' Hesap ayrıntıları ve etkinlik akışı yalnızca sahibi hesabıyla açılır (ADMIN_OWNER_EMAIL).'}
      </p>
      {children}
    </div>
  );
}

export function Section({ title, note, children }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div className="label" style={{ color: 'var(--text-muted)', marginBottom: note ? 4 : 12 }}>{title}</div>
      {note && <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>{note}</p>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div style={{ minWidth: 150, flex: '1 1 150px' }}>
      <div className="label" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700 }}>{value}</div>
      {hint && <div className="muted" style={{ fontSize: 11 }}>{hint}</div>}
    </div>
  );
}

export function StatRow({ children }) {
  return <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>{children}</div>;
}

export function RecordTable({ rows, columns, empty = 'Henüz kayıt yok.' }) {
  if (rows.length === 0) return <div className="muted">{empty}</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || row.idFull || i}>
              {columns.map((col) => <td key={col.key}>{col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DailyBarChart({ daily }) {
  const maxCount = Math.max(1, ...daily.map((d) => d.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
      {daily.map((d) => (
        <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{d.count}</div>
          <div style={{ width: '100%', maxWidth: 40, background: 'var(--teal)', borderRadius: 6, height: `${Math.max(4, (d.count / maxCount) * 110)}px` }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.day.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

export function decisionBreakdown(decisions) {
  if (!decisions.total) return '0';
  const parts = Object.entries(REC_LABELS).filter(([k]) => decisions[k]).map(([k, label]) => `${label} ${decisions[k]}`);
  return `${decisions.total} · ${parts.join(' · ')}`;
}

export function scanBreakdown(scans) {
  if (!scans.total) return '0';
  return `${scans.total} (onaylı ${scans.confirmed} · kapanan ${scans.closed} · açık ${scans.open})`;
}

export function deviceText(visit) {
  if (!visit) return '—';
  return [visit.deviceClass, visit.os, visit.browser].filter(Boolean).join(' · ') || '—';
}

export function locationText(visit) {
  return visit?.location ? `~ ${visit.location}` : 'bilinmiyor';
}

// Account-session counts are attributed by time window; rows that fall in
// overlapping sessions are shown separately as "(+n?)", never as exact.
export function windowCount(n, ambiguous) {
  return ambiguous ? `${n} (+${ambiguous}?)` : String(n);
}

export function InternalToggle({ session, returnTo }) {
  return (
    <form action="/api/admin/session-internal-test" method="POST" style={{ margin: 0 }}>
      <input type="hidden" name="sessionId" value={session.idFull} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="value" value={session.internal ? '0' : '1'} />
      <button type="submit" className={session.internal ? 'btn-primary' : 'btn-outline'} style={pill('sm')}>
        {session.internal ? 'İç/Test' : 'Dış'}
      </button>
    </form>
  );
}

// One human line per timeline item; product content never appears here.
export function timelineText(item) {
  const times = item.count > 1 ? ` (×${item.count})` : '';
  switch (item.type) {
    case 'login': return item.detail === 'guest' ? 'Misafir oturumu başladı' : 'Giriş (e-posta kodu)';
    case 'room_created': return `Oda oluşturuldu${item.detail ? ` — ${item.detail}` : ''}`;
    case 'room_photo': return `Oda fotoğrafı yüklendi${times}${item.detail ? ` — ${item.detail}` : ''}`;
    case 'chat_photo': return `Sohbete fotoğraf eklendi${times}`;
    case 'room_scan': return `Oda taraması${item.detail ? ` — ${item.detail}` : ''} · ${SCAN_STATUS_LABELS[item.status] || item.status}`;
    case 'single_analysis': return `Tek eşya analizi${times} (yaklaşık, eski ölçüm)`;
    case 'chat_message': return `Sohbet mesajı${times}`;
    case 'decision': return `Karar: ${REC_LABELS[item.recommendation] || item.recommendation}${item.detail ? ` — ${item.detail}` : ''}${item.room ? ` · ${item.room}` : item.source === 'tekli' ? ' · Tek eşya' : ''}`;
    case 'toparla': return `Toparla · ${TOPARLA_STATUS_LABELS[item.status] || item.status}`;
    case 'feedback': return `Geri bildirim gönderildi${item.detail ? ` (${item.detail})` : ''}`;
    case 'last_interaction': return 'Son etkileşim';
    case 'session_end': return `Oturum sonu: ${SESSION_STATUS_LABELS[item.detail] || item.detail}`;
    default: return item.type;
  }
}

export function attributionText(item) {
  if (item.attribution === 'exact') return `#${item.sessionShorts[0]}`;
  if (item.attribution === 'ambiguous') return `oturum belirsiz (${item.sessionShorts.map((s) => `#${s}`).join(', ')})`;
  return 'oturum dışı / V2 öncesi';
}
