import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// Auth.js'in @auth/drizzle-adapter'inin resmi olarak beklediği sema
// (node_modules/@auth/drizzle-adapter/lib/sqlite.js'teki defineTables() ile
// birebir ayni kolonlar/turler) — sadece tablo adlari, uygulamanin kendi
// `users` tablosuyla karismasin diye `auth_` on ekiyle ozellestirildi.
// Oturum stratejisi JWT oldugu icin ayri bir sessions tablosu yok.

export const authUser = sqliteTable('auth_user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
});

export const authAccount = sqliteTable(
  'auth_account',
  {
    userId: text('userId')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compositePk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const authVerificationToken = sqliteTable(
  'auth_verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);
