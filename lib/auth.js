import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import rawDb from '@/lib/db';
import { consumePendingSignupName } from '@/lib/db';
import { authUser, authAccount, authVerificationToken } from '@/lib/authSchema';

const drizzleDb = drizzle(rawDb);

// Sadece RESEND_API_KEY'e bakmak yeterli degil — gonderen adresi
// (AUTH_EMAIL_FROM) yapilandirilmadan Resend zaten gonderimi reddeder.
// Bu, e-posta girisinin GERCEKTEN calisip calismayacaginin nihai kaniti
// degil (domain dogrulamasi, gercek teslimat ayrica test edilmeli) —
// sadece istemciye "deneme bile yapilamaz" durumunu erken bildirmek icin.
export function isEmailReady() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim()
  );
}

// Resend provider'ının varsayılanı İngilizce bir şablon ("Sign in to host")
// gönderiyor (node_modules/@auth/core/providers/resend.js). Aynı Resend API
// çağrısı, Türkçe içerikle.
async function sendVerificationRequest({ identifier: to, provider, url }) {
  const escapedUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: 'Bir Oda. Bir Eşya. — giriş bağlantın',
      html: `<body style="background:#F3ECE2;margin:0;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#3B2A1E">
  <div style="max-width:440px;margin:0 auto;background:#FFFDF9;border-radius:16px;padding:28px 24px">
    <p style="font-size:18px;margin:0 0 12px">Merhaba, ben Sestia.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px">Aşağıdaki düğmeyle giriş yapabilir, kaldığın yerden devam edebilirsin.</p>
    <p style="margin:0 0 20px"><a href="${escapedUrl}" style="display:inline-block;background:#7A5638;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px">Giriş yap</a></p>
    <p style="font-size:13px;line-height:1.5;color:#7A6A5C;margin:0">Bağlantı 24 saat geçerli. Bu e-postayı sen istemediysen görmezden gelebilirsin.</p>
  </div>
</body>`,
      text: `Merhaba, ben Sestia.\n\nGiriş yapmak için bu bağlantıyı aç:\n${url}\n\nBağlantı 24 saat geçerli. Bu e-postayı sen istemediysen görmezden gelebilirsin.\n`,
    }),
  });
  if (!res.ok) throw new Error('Resend error: ' + JSON.stringify(await res.json()));
}

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
      sendVerificationRequest,
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
