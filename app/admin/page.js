import { getActiveDeviceCount, getDailyUsage, getRecentFeedback, getRecentErrors } from '@/lib/db';

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
              background: 'var(--terracotta)',
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

export default function AdminPage() {
  const activeDevices = getActiveDeviceCount(7);
  const daily = getDailyUsage(7);
  const feedback = getRecentFeedback(50);
  const errors = getRecentErrors(50);

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '36px 20px 80px' }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600 }}>Sahibi Paneli</h1>

      <section style={{ marginTop: 28 }}>
        <div className="label" style={{ color: 'var(--text-muted)' }}>Aktif Cihaz (son 7 gün)</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 700 }}>{activeDevices}</div>
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
            { key: 'device_id', label: 'Cihaz', render: (v) => v.slice(0, 8) },
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
            { key: 'device_id', label: 'Cihaz', render: (v) => (v ? v.slice(0, 8) : '—') },
            { key: 'screen', label: 'Ekran' },
            { key: 'message', label: 'Mesaj' },
          ]}
        />
      </section>
    </div>
  );
}
