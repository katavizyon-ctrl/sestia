import crypto from 'node:crypto';
import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import rawDb from '@/lib/db';
import { consumePendingSignupName } from '@/lib/db';
import { authUser, authAccount, authVerificationToken } from '@/lib/authSchema';
import privateAccess from '@/lib/privateAccess.cjs';

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

// Giriş kodu e-postası. Kişi kodu uygulamaya yazar ve aynı tarayıcıda kalır
// (bağlantı Gmail'den Chrome gibi başka bir uygulamada açılınca oturum orada
// kalıyordu). Konuda kod var: bildirimde görünür ve her e-posta ayrı başlıkla
// gelir, Gmail eski e-postalarla aynı konuşmada toplamaz.
function tokenFingerprint(token, secret) {
  return crypto.createHash('sha256').update(`${token}${secret}`).digest('hex').slice(0, 8);
}

async function sendVerificationRequest({ identifier: to, provider, url, token }) {
  const escapedUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  // Tanı: gönderilen kodun parmak izi; doğrulamadaki parmak iziyle karşılaştırılır.
  console.info('magic_code_sent', JSON.stringify({ fp: tokenFingerprint(token, provider.secret ?? process.env.AUTH_SECRET), codeLength: String(token).length }));
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: `SESTIA giriş kodun: ${token}`,
      html: `<body style="background:#F3ECE2;margin:0;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#3B2A1E">
  <div style="max-width:440px;margin:0 auto;background:#FFFDF9;border-radius:16px;padding:28px 24px">
    <p style="font-size:18px;margin:0 0 12px">Merhaba, ben Sestia.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Giriş kodun:</p>
    <p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:0 0 20px;font-family:Menlo,Consolas,monospace">${token}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px">Bu kodu, e-postanı yazdığın Sestia ekranına gir.</p>
    <p style="font-size:13px;line-height:1.5;color:#7A6A5C;margin:0 0 8px">Aynı tarayıcıdaysan <a href="${escapedUrl}" style="color:#183C3F">bu bağlantıyla</a> da girebilirsin.</p>
    <p style="font-size:13px;line-height:1.5;color:#7A6A5C;margin:0">Kod 15 dakika geçerli. Bu e-postayı sen istemediysen görmezden gelebilirsin.</p>
  </div>
</body>`,
      text: `Merhaba, ben Sestia.\n\nGiriş kodun: ${token}\n\nBu kodu, e-postanı yazdığın Sestia ekranına gir. Kod 15 dakika geçerli.\n\nBu e-postayı sen istemediysen görmezden gelebilirsin.\n`,
    }),
  });
  if (!res.ok) throw new Error('Resend error: ' + JSON.stringify(await res.json()));
}

const baseAdapter = DrizzleAdapter(drizzleDb, {
  usersTable: authUser,
  accountsTable: authAccount,
  verificationTokensTable: authVerificationToken,
});

// Diagnostics for magic links that fail with Verification: logs WHICH part did
// not match (never the token or the full email) so a mangled link can be told
// apart from an expired or already used one.
function emailShape(value) {
  if (typeof value !== 'string') return { type: typeof value };
  const [local = '', domain = ''] = value.split('@');
  return { first: local.slice(0, 1), localLength: local.length, domain, hasPercent: value.includes('%'),
    hasUpper: value !== value.toLowerCase(), hasSpace: /\s/.test(value), length: value.length };
}
const adapter = {
  ...baseAdapter,
  async useVerificationToken(params) {
    const found = await baseAdapter.useVerificationToken(params);
    if (!found) {
      try {
        const byToken = rawDb.prepare('SELECT identifier FROM auth_verificationToken WHERE token = ?').get(params.token);
        const forIdentifier = rawDb.prepare('SELECT COUNT(*) AS c FROM auth_verificationToken WHERE identifier = ?').get(params.identifier ?? null).c;
        const total = rawDb.prepare('SELECT COUNT(*) AS c FROM auth_verificationToken').get().c;
        const storedFps = rawDb.prepare('SELECT substr(token, 1, 8) AS fp FROM auth_verificationToken').all().map((row) => row.fp);
        console.warn('magic_link_miss', JSON.stringify({
          linkFp: String(params.token).slice(0, 8),
          storedFps,
          tokenKnown: Boolean(byToken),
          storedIdentifierShape: byToken ? emailShape(byToken.identifier) : null,
          linkIdentifierShape: emailShape(params.identifier),
          tokensForLinkIdentifier: forIdentifier,
          tokensTotal: total,
        }));
      } catch (error) {
        console.warn('magic_link_miss_diagnostic_failed', error.message);
      }
    }
    return found;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
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
    signIn({ user }) {
      // Runs before sending a verification email AND when consuming its link.
      return privateAccess.isAllowedEmail(user?.email);
    },
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
  // Auth.js'in İngilizce hata sayfası yerine Türkçe, yeni kod istemeye yönlendiren sayfa.
  pages: { error: '/giris-hatasi' },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM,
      sendVerificationRequest,
      // 6 haneli kod, 15 dakika. Deneme sayısı proxy.js'te sınırlı.
      maxAge: 15 * 60,
      generateVerificationToken: () => String(crypto.randomInt(0, 1000000)).padStart(6, '0'),
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
