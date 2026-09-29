import db from '@/lib/db';
import adminActivityModule from '@/lib/adminActivity.cjs';

// The app's single connection, wired to the read-only admin queries. Kept
// out of lib/db.js so that module's schema bootstrap stays unchanged.
export const adminActivity = adminActivityModule.createAdminActivity(db);
