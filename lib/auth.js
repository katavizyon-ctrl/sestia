import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import rawDb from '@/lib/db';
import { authUser, authAccount, authVerificationToken } from '@/lib/authSchema';

const drizzleDb = drizzle(rawDb);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(drizzleDb, {
    usersTable: authUser,
    accountsTable: authAccount,
    verificationTokensTable: authVerificationToken,
  }),
  // DB oturumu yerine JWT: ayri bir sessions tablosu gerekmiyor, oturum
  // durumu imzali bir cookie'de tutuluyor.
  session: { strategy: 'jwt' },
  // Auth.js JWT stratejisinde token.sub -> session.user.id otomatik
  // kopyalanmiyor (dogrudan /api/auth/session'a karsi test ederek
  // dogrulandi) — getIdentity()'nin session.user.id'ye guvenebilmesi icin
  // burada acikca tasimak gerekiyor.
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token?.id) session.user.id = token.id;
      return session;
    },
  },
  // Railway (Vercel disi) bir hostta calistigimiz icin sart — yoksa Auth.js
  // Host header'ini guvenilir bulmaz.
  trustHost: true,
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM,
    }),
  ],
  secret: process.env.AUTH_SECRET,
});
