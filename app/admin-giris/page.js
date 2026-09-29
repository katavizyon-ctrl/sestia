import { redirect } from 'next/navigation';
import { Brand, PageHeading } from '@/components/SestiaExperience';
import adminAccess from '@/lib/adminAccess.cjs';
import { getAdminAccess } from '@/lib/adminGuard';
import AdminCodeForm from './AdminCodeForm';
import AdminOwnerLoginForm from './AdminOwnerLoginForm';

export const dynamic = 'force-dynamic';

// Owner mode (ADMIN_OWNER_EMAIL): the owner signs in here directly with the
// existing email code and lands on /admin — no invite code, no onboarding.
// An owner who is already signed in goes straight to /admin.
export default async function AdminGirisPage() {
  const ownerMode = adminAccess.ownerMode();
  if (ownerMode && (await getAdminAccess())?.mode === 'owner') redirect('/admin');
  return <div className="app"><section className="view sestia-onboarding"><div className="scroll"><Brand/>
    {ownerMode
      ? <><PageHeading title="Sahibi Paneli" center>Panel yalnızca sahibi hesabıyla açılır. E-postana gelecek kodla giriş yap.</PageHeading><AdminOwnerLoginForm/></>
      : <><PageHeading title="Sahibi Paneli" center>Yönetici erişim kodunu gir.</PageHeading><AdminCodeForm/></>}
  </div></section></div>;
}
