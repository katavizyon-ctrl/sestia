import { adminActivity } from '@/lib/adminData';
import { requireAdmin } from '@/lib/adminGuard';
import adminActivityModule from '@/lib/adminActivity.cjs';
import {
  AdminShell, Section, RecordTable, InternalToggle, SESSION_STATUS_LABELS, adminHref, pill,
  formatIstanbul, formatDuration, deviceText, locationText, windowCount,
} from '../_ui';

export const dynamic = 'force-dynamic';

const KINDS = [
  { key: 'all', label: 'Tümü' },
  { key: 'guest', label: 'Misafir' },
  { key: 'account', label: 'Hesap' },
];

export default async function SessionsPage({ searchParams }) {
  const access = await requireAdmin('/admin/oturumlar');
  const sp = (await searchParams) || {};
  const testMode = adminActivityModule.parseTestMode(sp.test);
  const kind = KINDS.some((k) => k.key === sp.tur) ? sp.tur : 'all';
  const sessions = adminActivity.listSessions({ kind, testMode, limit: 100 });
  const owner = access.mode === 'owner';
  const returnTo = adminHref('/admin/oturumlar', { tur: kind, test: testMode });
  const count = (row, pick) => windowCount(pick(row.counts), row.attribution === 'exact' ? 0 : pick(row.ambiguousCounts));

  return (
    <AdminShell title="Oturumlar / Ziyaretler" active="sessions" testMode={testMode}
      testModePath="/admin/oturumlar" testModeParams={{ tur: kind }} access={access}>
      <Section title={`Oturumlar (${sessions.length})`}
        note="Bunlar oturum sayılarıdır, kişi sayısı değildir: her misafir oturumu ayrı bir kimliktir ve birbirine bağlanmaz. Misafir satırlarındaki sayılar kesindir (misafir kimliği = tek oturum). Hesap satırlarındaki sayılar zaman penceresiyle o oturuma eşlenir; (+n?) aynı hesabın çakışan başka bir oturumu nedeniyle belirsiz kayıtlardır. Etkileşim aralığı kesin dikkat süresi değildir.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {KINDS.map((k) => (
            <a key={k.key} href={adminHref('/admin/oturumlar', { tur: k.key, test: testMode })}
              className={kind === k.key ? 'btn-primary' : 'btn-outline'}
              style={pill()}>{k.label}</a>
          ))}
        </div>
        <RecordTable
          rows={sessions}
          empty="Bu filtreyle oturum yok."
          columns={[
            { key: 'startedAt', label: 'Başlangıç', render: (v) => formatIstanbul(v) },
            { key: 'kind', label: 'Tür', render: (v) => (v === 'account' ? 'Hesap' : 'Misafir') },
            { key: 'maskedEmail', label: 'Kimlik', render: (v, row) => (row.kind === 'account'
              ? (owner ? <a href={`/admin/hesaplar/${row.accountId}`}>{v || row.subjectShort}</a> : v || row.subjectShort)
              : `misafir #${row.subjectShort}`) },
            { key: 'id', label: 'Oturum', render: (v) => `#${v}` },
            { key: 'status', label: 'Durum', render: (v) => SESSION_STATUS_LABELS[v] || v },
            { key: 'lastActivityAt', label: 'Son etkileşim', render: (v) => formatIstanbul(v) },
            { key: 'interactionSpanMs', label: 'Etkileşim aralığı', render: (v) => formatDuration(v) },
            { key: 'location', label: 'Yaklaşık konum', render: (_, row) => locationText(row.visit) },
            { key: 'visit', label: 'Cihaz', render: (v) => deviceText(v) },
            { key: 'entry', label: 'Giriş / Kaynak', render: (_, row) => row.visit.entryPath || row.visit.referrerHost || '—' },
            { key: 'rooms', label: 'Oda', render: (_, row) => count(row, (c) => c.rooms) },
            { key: 'photos', label: 'Fotoğraf', render: (_, row) => count(row, (c) => c.roomPhotos + c.chatPhotos) },
            { key: 'scans', label: 'Tarama', render: (_, row) => count(row, (c) => c.roomScans.total) },
            { key: 'decisions', label: 'Karar', render: (_, row) => count(row, (c) => c.decisions.total) },
            { key: 'chat', label: 'Sohbet', render: (_, row) => count(row, (c) => c.chatTurns) },
            { key: 'toparla', label: 'Toparla', render: (_, row) => count(row, (c) => c.toparla.total) },
            { key: 'feedback', label: 'Geri bildirim', render: (_, row) => count(row, (c) => c.feedback) },
            { key: 'internal', label: 'İç/Test', render: (_, row) => <InternalToggle session={row} returnTo={returnTo} /> },
          ]}
        />
      </Section>
    </AdminShell>
  );
}
