import { getAdminAccess } from '@/lib/adminGuard';
import AdminSessionKeeper from './AdminSessionKeeper';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const access = await getAdminAccess();
  return access?.mode === 'owner' ? <AdminSessionKeeper>{children}</AdminSessionKeeper> : children;
}
