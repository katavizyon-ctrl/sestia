import { adminActivity } from '@/lib/adminData';
import { requireAdmin } from '@/lib/adminGuard';
import adminActivityModule from '@/lib/adminActivity.cjs';
import { AdminShell, Section, RecordTable, formatIstanbul, formatDuration, decisionBreakdown, scanBreakdown, deviceText, locationText } from '../_ui';

export const dynamic = 'force-dynamic';

export default async function AccountsPage({ searchParams }) {
  const access = await requireAdmin('/admin/hesaplar');
  const testMode = adminActivityModule.parseTestMode((await searchParams)?.test);
  const accounts = adminActivity.listAccounts({ testMode });
  const owner = access.mode === 'owner';

  return (
    <AdminShell title="Hesaplar" active="accounts" testMode={testMode} testModePath="/admin/hesaplar" access={access}>
      <Section title={`Hesaplar (${accounts.length})`}
        note="Yalnızca hesaplar listelenir; misafirler kalıcı kullanıcı değildir, Oturumlar sayfasında oturum olarak görünür. Giriş sayıları ve etkileşim aralığı Session V2 döneminden itibarendir; öncesi için oturum kaydı yoktur. Etkileşim aralığı, oturumdaki ilk ve son bilinçli etkileşim arasındaki süredir: kesin dikkat süresi değildir. Tüm oturumları İç/Test işaretli hesaplar varsayılan olarak gizlenir.">
        <RecordTable
          rows={accounts}
          empty="Bu filtreyle hesap yok."
          columns={[
            { key: 'maskedEmail', label: 'E-posta', render: (v, row) => (owner ? <a href={`/admin/hesaplar/${row.id}`}>{v || row.id.slice(0, 8)}</a> : v || row.id.slice(0, 8)) },
            { key: 'name', label: 'Hitap' },
            { key: 'firstSeenAt', label: 'İlk görülme', render: (v) => formatIstanbul(v) },
            { key: 'firstLoginAt', label: 'İlk giriş (V2)', render: (v) => (v ? formatIstanbul(v) : 'V2 öncesi') },
            { key: 'latestLoginAt', label: 'Son giriş', render: (v, row) => (v ? formatIstanbul(v)
              : row.lastVerifiedEmailAt ? `${formatIstanbul(row.lastVerifiedEmailAt)} (e-posta doğrulaması)` : '—') },
            { key: 'loginCount', label: 'Giriş', render: (v, row) => (row.preSessionV2Only ? 'V2 öncesi' : v) },
            { key: 'lastActiveAt', label: 'Son etkinlik', render: (v) => formatIstanbul(v) },
            { key: 'interactionSpanMs', label: 'Yaklaşık etkileşim aralığı', render: (v, row) => (row.preSessionV2Only ? '—' : formatDuration(v)) },
            { key: 'latestVisit', label: 'Son cihaz', render: (v) => deviceText(v) },
            { key: 'latestVisitLocation', label: 'Yaklaşık konum', render: (_, row) => locationText(row.latestVisit) },
            { key: 'rooms', label: 'Oda', render: (_, row) => row.summary.rooms },
            { key: 'roomPhotos', label: 'Oda fotoğrafı', render: (_, row) => row.summary.roomPhotos },
            { key: 'roomScans', label: 'Oda taraması', render: (_, row) => scanBreakdown(row.summary.roomScans) },
            { key: 'decisions', label: 'Karar', render: (_, row) => decisionBreakdown(row.summary.decisions) },
            { key: 'chatTurns', label: 'Sohbet turu', render: (_, row) => row.summary.chatTurns },
            { key: 'toparla', label: 'Toparla', render: (_, row) => row.summary.toparla.total },
            { key: 'feedback', label: 'Geri bildirim', render: (_, row) => row.summary.feedback },
            { key: 'internalSessions', label: 'İç/Test', render: (v, row) => (row.loginCount ? `${v}/${row.loginCount} oturum` : '—') },
          ]}
        />
      </Section>
    </AdminShell>
  );
}
