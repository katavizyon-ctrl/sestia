'use client';

import { SessionLifecycleProvider } from '@/components/SessionLifecycleProvider';

// Owner mode only: the admin panel lives inside the owner's Session V2
// account session, so its genuine clicks/keys renew that session exactly as
// they would in the app (same provider, same activity endpoint, no extra
// traffic), and its expiry closes the panel instead of leaving stale pages.
export default function AdminSessionKeeper({ children }) {
  return (
    <SessionLifecycleProvider onLifecycleEnded={() => window.location.assign('/admin-giris')}>
      {children}
    </SessionLifecycleProvider>
  );
}
