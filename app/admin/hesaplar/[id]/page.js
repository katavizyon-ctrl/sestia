import { notFound } from 'next/navigation';
import { adminActivity } from '@/lib/adminData';
import { requireAdmin } from '@/lib/adminGuard';
import {
  AdminShell, Section, Stat, StatRow, RecordTable, InternalToggle, REC_LABELS, SESSION_STATUS_LABELS,
  formatIstanbul, formatIstanbulTime, istanbulDayKey, formatDuration, scanBreakdown, deviceText, locationText,
  windowCount, timelineText, attributionText,
} from '../../_ui';

export const dynamic = 'force-dynamic';

function Timeline({ items }) {
  if (!items.length) return <div className="muted">Henüz etkinlik yok.</div>;
  let lastDay = null;
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14 }}>
      {items.map((item, i) => {
        const day = istanbulDayKey(item.at);
        const header = day !== lastDay;
        lastDay = day;
        return (
          <li key={i}>
            {header && <div className="label" style={{ color: 'var(--text-muted)', margin: '14px 0 6px' }}>{day}</div>}
            <div style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>{formatIstanbulTime(item.at)}</span>
              <span style={{ flex: 1 }}>{timelineText(item)}</span>
              <span className="muted" style={{ fontSize: 12 }}>{attributionText(item)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function AccountDetailPage({ params }) {
  const { id } = await params;
  const access = await requireAdmin(`/admin/hesaplar/${String(id).slice(0, 8)}`);
  if (access.mode !== 'owner') {
    return (
      <AdminShell title="Hesap ayrıntısı" active="accounts" access={access}>
        <Section title="Sahibi hesabı gerekli">
          <p className="muted">Kişi bazında oturumlar ve etkinlik akışı yalnızca sahibi hesabıyla, etkin bir oturumda görüntülenir. Sunucuda ADMIN_OWNER_EMAIL ayarlanmalı ve bu hesapla giriş yapılmalıdır.</p>
        </Section>
      </AdminShell>
    );
  }
  const detail = adminActivity.getAccount(id);
  if (!detail) notFound();
  const { account, sessions, timeline, feedback, attributionTotals } = detail;
  const returnTo = `/admin/hesaplar/${account.id}`;

  return (
    <AdminShell title={account.name || account.email || 'Hesap'} active="accounts" access={access}>
      <Section title="Hesap">
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px', margin: 0, fontSize: 14 }}>
          <dt className="muted">E-posta</dt><dd style={{ margin: 0 }}>{account.email || '—'}</dd>
          <dt className="muted">Hitap</dt><dd style={{ margin: 0 }}>{account.name || '—'}</dd>
          <dt className="muted">İlk görülme</dt><dd style={{ margin: 0 }}>{formatIstanbul(account.firstSeenAt)}</dd>
          <dt className="muted">İlk giriş (V2)</dt><dd style={{ margin: 0 }}>{account.firstLoginAt ? formatIstanbul(account.firstLoginAt) : 'Session V2 döneminde giriş yok'}</dd>
          <dt className="muted">Son giriş</dt><dd style={{ margin: 0 }}>{formatIstanbul(account.latestLoginAt)}</dd>
          <dt className="muted">Son e-posta doğrulaması</dt><dd style={{ margin: 0 }}>{formatIstanbul(account.lastVerifiedEmailAt)}</dd>
          <dt className="muted">Giriş / oturum sayısı</dt><dd style={{ margin: 0 }}>{account.loginCount}</dd>
          <dt className="muted">Son etkinlik</dt><dd style={{ margin: 0 }}>{formatIstanbul(account.lastActiveAt)}</dd>
          <dt className="muted">Yaklaşık etkileşim aralığı</dt>
          <dd style={{ margin: 0 }}>{formatDuration(account.interactionSpanMs)} <span className="muted" style={{ fontSize: 12 }}>
            (oturumlardaki ilk ve son bilinçli etkileşim arası, toplam; kesin dikkat süresi değildir · {account.activityReports} etkileşim bildirimi)</span></dd>
          <dt className="muted">Son cihaz</dt><dd style={{ margin: 0 }}>{deviceText(account.latestVisit)} · {locationText(account.latestVisit)}</dd>
        </dl>
      </Section>

      <Section title="Ürün özeti">
        <StatRow>
          <Stat label="Oda" value={account.summary.rooms} />
          <Stat label="Oda fotoğrafı" value={account.summary.roomPhotos} />
          <Stat label="Sohbet fotoğrafı" value={account.summary.chatPhotos} />
          <Stat label="Oda taraması" value={account.summary.roomScans.total} hint={scanBreakdown(account.summary.roomScans)} />
          <Stat label="Karar" value={account.summary.decisions.total}
            hint={Object.entries(REC_LABELS).map(([k, l]) => `${l} ${account.summary.decisions[k]}`).join(' · ')} />
          <Stat label="Sohbet turu" value={account.summary.chatTurns} />
          <Stat label="Toparla" value={account.summary.toparla.total}
            hint={`tamamlanan ${account.summary.toparla.completed} · başarısız ${account.summary.toparla.failed}`} />
          <Stat label="Geri bildirim" value={account.summary.feedback} />
          <Stat label="Tek eşya analizi (yaklaşık)" value={account.summary.singleAnalysesApprox} hint="Eski istemci ölçümü" />
        </StatRow>
      </Section>

      <Section title="Etkinlik akışı"
        note={`Ürün kayıtlarında oturum kimliği yoktur; her kayıt zaman penceresiyle bir oturuma eşlenir. ${attributionTotals.exact} kayıt tek bir oturuma, ${attributionTotals.ambiguous} kayıt çakışan oturumlar nedeniyle belirsiz, ${attributionTotals.outside} kayıt oturum dışı (çoğunlukla Session V2 öncesi). İçerik (sohbet, analiz metni, fotoğraf) gösterilmez.`}>
        <Timeline items={timeline} />
      </Section>

      <Section title={`Oturumlar (${sessions.length})`}
        note="Her hesap oturumu bir e-posta kodu girişidir. Sayılar zaman penceresiyle eşlenir; (+n?) çakışan oturumlar nedeniyle belirsiz kayıtlardır.">
        <RecordTable
          rows={sessions}
          empty="Session V2 döneminde oturum yok."
          columns={[
            { key: 'startedAt', label: 'Başlangıç', render: (v) => formatIstanbul(v) },
            { key: 'endAt', label: 'Bitiş', render: (v, row) => (v ? `${formatIstanbul(v)}${row.statusComputed ? ' (hesaplanan)' : ''}` : '—') },
            { key: 'status', label: 'Durum', render: (v) => SESSION_STATUS_LABELS[v] || v },
            { key: 'lastActivityAt', label: 'Son etkileşim', render: (v) => formatIstanbul(v) },
            { key: 'interactionSpanMs', label: 'Etkileşim aralığı', render: (v) => formatDuration(v) },
            { key: 'activityReports', label: 'Bildirim' },
            { key: 'visit', label: 'Cihaz', render: (v) => deviceText(v) },
            { key: 'location', label: 'Yaklaşık konum', render: (_, row) => locationText(row.visit) },
            { key: 'timezone', label: 'Saat dilimi', render: (_, row) => row.visit.timezone || '—' },
            { key: 'id', label: 'Oturum', render: (v) => `#${v}` },
            { key: 'rooms', label: 'Oda', render: (_, row) => windowCount(row.counts.rooms, row.ambiguousCounts.rooms) },
            { key: 'decisions', label: 'Karar', render: (_, row) => windowCount(row.counts.decisions.total, row.ambiguousCounts.decisions.total) },
            { key: 'chat', label: 'Sohbet', render: (_, row) => windowCount(row.counts.chatTurns, row.ambiguousCounts.chatTurns) },
            { key: 'internal', label: 'İç/Test', render: (_, row) => <InternalToggle session={row} returnTo={returnTo} /> },
          ]}
        />
      </Section>

      <Section title={`Geri bildirim (${feedback.length})`}>
        <RecordTable
          rows={feedback}
          columns={[
            { key: 'at', label: 'Tarih', render: (v) => formatIstanbul(v) },
            { key: 'screen', label: 'Ekran' },
            { key: 'message', label: 'Mesaj' },
          ]}
        />
      </Section>
    </AdminShell>
  );
}
