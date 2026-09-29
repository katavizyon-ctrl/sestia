import { Brand, PageHeading } from '@/components/SestiaExperience';
import adminAccess from '@/lib/adminAccess.cjs';
import AdminCodeForm from './AdminCodeForm';

export const dynamic = 'force-dynamic';

// Owner mode (ADMIN_OWNER_EMAIL): the panel opens only for the owner's own
// verified account session — no code form is offered at all.
export default function AdminGirisPage() {
  const ownerMode = adminAccess.ownerMode();
  return <div className="app"><section className="view sestia-onboarding"><div className="scroll"><Brand/>
    {ownerMode
      ? <><PageHeading title="Sahibi Paneli" center>Panel yalnızca sahibi hesabıyla açılır.</PageHeading>
          <p className="muted" style={{ textAlign: 'center' }}>SESTIA&apos;ya sahibi e-postanla, gelen kodla giriş yap; ardından bu sayfaya dön. Oturumun hareketsizlikten kapandıysa yeniden giriş yapman gerekir.</p>
          <a className="btn-primary" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>SESTIA&apos;ya git →</a>
          <a className="btn-outline" href="/admin" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 10 }}>Paneli yeniden dene</a></>
      : <><PageHeading title="Sahibi Paneli" center>Yönetici erişim kodunu gir.</PageHeading><AdminCodeForm/></>}
  </div></section></div>;
}
