import { adminActivity } from '@/lib/adminData';
import { requireAdmin } from '@/lib/adminGuard';
import adminActivityModule from '@/lib/adminActivity.cjs';
import { AdminShell, Section, Stat, StatRow, RecordTable, DailyBarChart, REC_LABELS, formatIstanbul, scanBreakdown } from './_ui';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }) {
  const access = await requireAdmin('/admin');
  const testMode = adminActivityModule.parseTestMode((await searchParams)?.test);
  const o = adminActivity.overview({ testMode, days: 7 });
  const feedback = adminActivity.recentFeedback({ limit: 50, testMode });
  const errors = adminActivity.recentErrors({ limit: 50, testMode });
  const owner = access.mode === 'owner';

  return (
    <AdminShell title="Sahibi Paneli" active="overview" testMode={testMode} testModePath="/admin" access={access}>
      <Section title="Son 7 gün"
        note="Hesaplar ve misafir oturumları ayrı sayılır: bir misafir oturumu bir kişi değildir, aynı kişi birçok misafir oturumu açabilir. Bir hesabın her oturumu bir e-posta kodu girişidir.">
        <StatRow>
          <Stat label="Aktif hesaplar" value={o.activeAccounts} hint="Son 7 günde etkileşimi olan hesap" />
          <Stat label="Hesap girişleri" value={o.accountLogins} hint="Session V2 hesap oturumu" />
          <Stat label="Misafir oturumları" value={o.guestSessions} />
          <Stat label="Anlamlı etkinliği olan misafir oturumları" value={o.meaningfulGuestSessions}
            hint="Oda, fotoğraf, analiz, karar, sohbet, Toparla veya geri bildirim" />
          <Stat label="Misafirden hesaba geçiş" value={o.conversions} hint="Aynı tarayıcıda, misafir oturumundan hemen sonra" />
        </StatRow>
      </Section>

      <Section title="Ürün kullanımı (tüm zamanlar)"
        note={o.preSessionV2Owners
          ? `Session V2 öncesinden oturum kaydı olmayan ${o.preSessionV2Owners} eski misafir kimliğinin kayıtları da dahildir; bunlar İç/Test olarak işaretlenemez.`
          : null}>
        <StatRow>
          <Stat label="Oda" value={o.totals.rooms} />
          <Stat label="Oda fotoğrafı" value={o.totals.roomPhotos} />
          <Stat label="Oda taraması" value={o.totals.roomScans.total} hint={scanBreakdown(o.totals.roomScans)} />
          <Stat label="Karar" value={o.totals.decisions.total} />
          <Stat label="Sohbet turu" value={o.totals.chatTurns} hint="Serbest Sestia sohbeti" />
          <Stat label="Toparla" value={o.totals.toparla.total} hint={`tamamlanan ${o.totals.toparla.completed} · başarısız ${o.totals.toparla.failed}`} />
          <Stat label="Geri bildirim" value={o.totals.feedback} />
          <Stat label="Tek eşya analizi (yaklaşık)" value={o.totals.singleAnalysesApprox}
            hint="Eski istemci ölçümü; tek eşya sohbet turlarını da sayar" />
        </StatRow>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, fontSize: 14 }}>
          {Object.entries(REC_LABELS).map(([k, label]) => <span key={k}><strong>{label}</strong> {o.totals.decisions[k]}</span>)}
        </div>
      </Section>

      <Section title="Günlük karar sayısı (son 7 gün, İstanbul günü)">
        <DailyBarChart daily={o.dailyDecisions} />
      </Section>

      <Section title={`Geri bildirimler (son ${feedback.length})`}>
        <RecordTable
          rows={feedback}
          columns={[
            { key: 'at', label: 'Tarih', render: (v) => formatIstanbul(v) },
            { key: 'maskedEmail', label: 'Kim', render: (v, row) => (v && owner && row.accountId
              ? <a href={`/admin/hesaplar/${row.accountId}`}>{v}</a> : v || row.ownerShort || '—') },
            { key: 'screen', label: 'Ekran' },
            { key: 'message', label: 'Mesaj' },
          ]}
        />
      </Section>

      <Section title={`Hatalar (son ${errors.length})`} note="İstemci tarafı hatalar; yığın izi gösterilmez. Sunucu hataları yalnızca Railway günlüklerindedir.">
        <RecordTable
          rows={errors}
          columns={[
            { key: 'at', label: 'Tarih', render: (v) => formatIstanbul(v) },
            { key: 'maskedEmail', label: 'Kim', render: (v, row) => v || row.ownerShort || '—' },
            { key: 'screen', label: 'Ekran' },
            { key: 'message', label: 'Mesaj' },
          ]}
        />
      </Section>
    </AdminShell>
  );
}
