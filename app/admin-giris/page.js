import { redirect } from 'next/navigation';
import { Brand, PageHeading } from '@/components/SestiaExperience';
import adminAccess from '@/lib/adminAccess.cjs';
import { getAdminAccess } from '@/lib/adminGuard';
import AdminCodeForm from './AdminCodeForm';

export const dynamic = 'force-dynamic';

// Only known keys are rendered — nothing from the URL is echoed.
const ERRORS = {
  kod: 'Kod yanlış, süresi dolmuş ya da daha önce kullanılmış. Yeni bir kod isteyebilirsin.',
  gonderilemedi: 'Kod gönderilemedi. Birazdan tekrar dener misin?',
  'cok-fazla': 'Çok fazla deneme yapıldı. Birkaç dakika sonra yeniden dene.',
};

// Owner mode (ADMIN_OWNER_EMAIL): one button sends the existing email code to
// the configured owner — the address is never shown or sent to the browser —
// then the 6-digit code signs in and returns to /admin. No invite code, no
// onboarding. An owner who is already signed in goes straight to /admin.
function OwnerLogin({ step, error }) {
  const codeStep = step === 'kod' || error === 'kod';
  return <>
    <PageHeading title="Sahibi Paneli" center>
      {codeStep ? 'E-postana gelen 6 haneli kodu gir.' : 'Panel yalnızca sahibi hesabıyla açılır. Giriş kodu sahibi e-posta adresine gönderilir.'}
    </PageHeading>
    {ERRORS[error] && <div role="alert" className="errbox">{ERRORS[error]}</div>}
    {codeStep && <form className="sestia-form" method="POST" action="/api/admin-login/verify">
      <label htmlFor="admin-login-code">Giriş kodu</label>
      <input id="admin-login-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" autoFocus/>
      <button className="btn-primary">Panele giriş yap →</button>
    </form>}
    <form className="sestia-form" method="POST" action="/api/admin-login" style={codeStep ? { marginTop: 10 } : undefined}>
      <button className={codeStep ? 'btn-outline' : 'btn-primary'}>{codeStep ? 'Yeni kod gönder' : 'Giriş kodu gönder →'}</button>
    </form>
  </>;
}

export default async function AdminGirisPage({ searchParams }) {
  const ownerMode = adminAccess.ownerMode();
  if (ownerMode && (await getAdminAccess())?.mode === 'owner') redirect('/admin');
  const { adim, hata } = (await searchParams) || {};
  return <div className="app"><section className="view sestia-onboarding"><div className="scroll"><Brand/>
    {ownerMode
      ? <OwnerLogin step={typeof adim === 'string' ? adim : null} error={typeof hata === 'string' ? hata : null} />
      : <><PageHeading title="Sahibi Paneli" center>Yönetici erişim kodunu gir.</PageHeading><AdminCodeForm/></>}
  </div></section></div>;
}
