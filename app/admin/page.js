import { getActiveDeviceCount, getDailyUsage, getRecentFeedback, getRecentErrors, getTesterAccounts, getSessionObservability } from '@/lib/db';

export const dynamic = 'force-dynamic';

function DailyBarChart({ daily }) {
  const maxCount = Math.max(1, ...daily.map((d) => d.count));
  if (daily.length === 0) return <div className="muted">Henüz veri yok.</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
      {daily.map((d) => (
        <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{d.count}</div>
          <div
            style={{
              width: '100%',
              maxWidth: 40,
              background: 'var(--teal)',
              borderRadius: 6,
              height: `${Math.max(4, (d.count / maxCount) * 110)}px`,
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.day.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

function RecordTable({ rows, columns }) {
  if (rows.length === 0) return <div className="muted">Henüz kayıt yok.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SESSION_FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'guest', label: 'Misafir' },
  { key: 'account', label: 'Hesap' },
  { key: 'external', label: 'Dış / Sınıflandırılmamış' },
  { key: 'internal', label: 'İç / Test' },
];

export default async function AdminPage({ searchParams }) {
  const activeDevices = getActiveDeviceCount(7);
  const daily = getDailyUsage(7);
  const feedback = getRecentFeedback(50);
  const errors = getRecentErrors(50);
  const testers = getTesterAccounts();
  const { filter: rawFilter } = (await searchParams) || {};
  const filter = SESSION_FILTERS.some((f) => f.key === rawFilter) ? rawFilter : 'all';
  const sessions = getSessionObservability({ filter, limit: 100 });

  return (
    <div className="sestia-admin"><div className="sestia-wordmark">SESTIA</div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600 }}>Sahibi Paneli</h1>

      <section style={{ marginTop: 28 }}>
        <div className="label" style={{ color: 'var(--text-muted)' }}>Aktif Cihaz (son 7 gün)</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 700 }}>{activeDevices}</div>
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          Test Kullanıcıları ({testers.length})
        </div>
        <RecordTable
          rows={testers}
          columns={[
            { key: 'email', label: 'E-posta' },
            { key: 'name', label: 'Hitap', render: (v) => v || '—' },
            { key: 'first_seen', label: 'İlk kullanım', render: (v) => v || 'Henüz girmedi' },
            { key: 'last_sign_in_ms', label: 'Son giriş', render: (v) => (v ? new Date(v).toISOString().slice(0, 16).replace('T', ' ') : '—') },
            { key: 'last_activity', label: 'Son etkinlik', render: (v) => v || '—' },
            { key: 'sessions', label: 'Oturum' },
            { key: 'analyses', label: 'Analiz' },
            { key: 'chats', label: 'Sohbet mesajı' },
            { key: 'decisions', label: 'Karar' },
            { key: 'rooms', label: 'Oda' },
            { key: 'feedback', label: 'Geri bildirim' },
          ]}
        />
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
          Oturumlar / Ziyaretler ({sessions.length})
        </div>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
          Bunlar oturum sayılarıdır, gerçek kişi sayısı değildir — aynı kişi farklı tarayıcı/cihaz/misafir
          kimliğiyle birden çok oturum oluşturabilir. Konum, IP&apos;den türetilen kaba bir tahmindir.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {SESSION_FILTERS.map((f) => (
            <a key={f.key} href={`/admin?filter=${f.key}`}
              className={filter === f.key ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '6px 14px', fontSize: 13, textDecoration: 'none', borderRadius: 999 }}>
              {f.label}
            </a>
          ))}
        </div>
        <RecordTable
          rows={sessions}
          columns={[
            { key: 'createdAt', label: 'İlk görülme' },
            { key: 'kind', label: 'Tür', render: (v) => (v === 'account' ? 'Hesap' : 'Misafir') },
            { key: 'accountEmail', label: 'E-posta', render: (v, row) => v || row.subjectId },
            { key: 'sessionId', label: 'Oturum' },
            { key: 'location', label: 'Tahmini konum' },
            { key: 'device', label: 'Cihaz' },
            { key: 'os', label: 'İşletim sistemi' },
            { key: 'browser', label: 'Tarayıcı' },
            { key: 'entryPath', label: 'Giriş / Kaynak', render: (v, row) => v || row.referrerHost || '—' },
            { key: 'lastActivity', label: 'Son etkinlik' },
            { key: 'status', label: 'Durum' },
            { key: 'rooms', label: 'Oda' },
            { key: 'decisions', label: 'Karar' },
            { key: 'chats', label: 'Sohbet' },
            { key: 'toparla', label: 'Toparla' },
            { key: 'feedback', label: 'Geri bildirim' },
            {
              key: 'internalTest', label: 'İç / Test',
              render: (v, row) => (
                <form action="/api/admin/session-internal-test" method="POST" style={{ margin: 0 }}>
                  <input type="hidden" name="sessionId" value={row.sessionIdFull} />
                  <input type="hidden" name="filter" value={filter} />
                  <input type="hidden" name="value" value={v ? '0' : '1'} />
                  <button type="submit" className={v ? 'btn-primary' : 'btn-outline'} style={{ padding: '4px 10px', fontSize: 12 }}>
                    {v ? 'İç/Test' : 'Dış'}
                  </button>
                </form>
              ),
            },
          ]}
        />
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          Günlük Karar Sayısı (son 7 gün)
        </div>
        <DailyBarChart daily={daily} />
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          Geri Bildirimler (son {feedback.length})
        </div>
        <RecordTable
          rows={feedback}
          columns={[
            { key: 'created_at', label: 'Tarih' },
            { key: 'device_id', label: 'Kim', render: (v, row) => row.email || (v ? v.slice(0, 8) : '—') },
            { key: 'screen', label: 'Ekran' },
            { key: 'message', label: 'Mesaj' },
          ]}
        />
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
          Hatalar (son {errors.length})
        </div>
        <RecordTable
          rows={errors}
          columns={[
            { key: 'created_at', label: 'Tarih' },
            { key: 'device_id', label: 'Kim', render: (v, row) => row.email || (v ? v.slice(0, 8) : '—') },
            { key: 'screen', label: 'Ekran' },
            { key: 'message', label: 'Mesaj' },
          ]}
        />
      </section>
    </div>
  );
}
