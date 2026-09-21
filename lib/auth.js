import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import rawDb from '@/lib/db';
import { consumePendingSignupName } from '@/lib/db';
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
  //
  // ONEMLI SINIR (gercek paket davranisiyla dogrulandi, node_modules/@auth/
  // core/lib/actions/session.js): JWT'nin "kayan" (rolling) suresi SADECE
  // gercekten /api/auth/session'a bir HTTP istegi gelince yenileniyor —
  // Route Handler icinden auth() cagirmak (getIdentity()'nin yaptigi gibi)
  // bunu TETIKLEMIYOR, cookie sessizce eski expiry'siyle kalmaya devam
  // ediyor. Bu yuzden app/page.js mount effect'inde ayrica /api/auth/session
  // cagriliyor — asil "30 gunde bir yenile" davranisini SAGLAYAN kisim o.
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
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
  events: {
    // Sadece GERCEKTEN yeni bir auth_user olusturuldugunda calisir
    // (node_modules/@auth/core/lib/actions/callback/handle-login.js:76-77).
    // Var olan bir hesap tekrar giris yaptiginda burasi TETIKLENMIYOR ve
    // Auth.js'in kendi cekirdek kodu o durumda sadece emailVerified'i
    // guncelliyor (name'e hic dokunmuyor) — yani mevcut hesabin ismini
    // yanlislikla degistirmemiz yapisal olarak mumkun degil.
    async createUser({ user }) {
      if (!user.email) return;
      const pendingName = consumePendingSignupName(user.email);
      if (pendingName) {
        await drizzleDb.update(authUser).set({ name: pendingName }).where(eq(authUser.id, user.id));
      }
    },
  },
});
