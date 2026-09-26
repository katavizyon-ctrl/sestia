import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import rawDb, { setPendingSignupName, consumePendingSignupName } from '@/lib/db';
import { authUser } from '@/lib/authSchema';
import { isEmailReady } from '@/lib/auth';

export const runtime = 'nodejs';

const drizzleDb = drizzle(rawDb);

// Auth.js'in kendi e-posta normalizer'iyla tutarli basit bir normalize
// (asil, tek gecerli dogrulama zaten Auth.js/Resend tarafinda yapilacak —
// burasi sadece "hesap var mi" on-kontrolu icin).
function normalizeEmail(raw) {
  return (raw || '').toString().normalize('NFKC').toLowerCase().trim();
}

// Bu rota, kullanici Auth.js'in gercek magic-link gonderimini (signIn())
// tetiklemeden ONCE cagrilir. Iki isi var:
//   - signup: forma girilen ismi, e-postaya anahtarli olarak gecici sakla
//     (dogrulama tamamlaninca lib/auth.js'teki events.createUser bunu okuyup
//     uygular). Kimin adina hangi hesap olusacagi hala sadece dogrulanmis
//     e-posta ile belirleniyor, bu rota hicbir hesap OLUSTURMUYOR.
//   - login: e-posta icin gercekten bir hesap var mi diye bakar. Yoksa,
//     Auth.js'in kendi varsayilan davranisi olan "her dogrulanan e-posta
//     icin otomatik hesap ac"i bu NOKTADA engelliyoruz — "Giris Yap"
//     akisinin sessizce yeni hesap acmasini istemiyoruz.
// NOT: bu, bir kullanilabilirlik/UX kapisi — sert bir guvenlik siniri
// degil. Biri Auth.js'in /api/auth/signin/resend'ini dogrudan cagirip bu
// on-kontrolu atlayabilir, ama en kotu ihtimalle SADECE kendi e-postasina
// (gercekten erisimi varsa) yeni bir hesap actirmis olur — baskasinin
// hesabina/verisine erisim saglamaz.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const flow = body?.flow === 'login' ? 'login' : 'signup';
    const email = normalizeEmail(body?.email);
    if (!email || !email.includes('@') || email.length > 200) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    if (flow === 'signup') {
      // Hitap isteğe bağlı: isimsiz geçen biri hesabını isimsiz açar (nötr
      // selamlama). Önceki bir denemeden kalan bekleyen isim de atılır ki
      // hesaba kişinin şimdi vermediği bir isim yazılmasın.
      const name = (body?.name || '').toString().trim().slice(0, 60);
      if (name) setPendingSignupName(email, name);
      else consumePendingSignupName(email);
      // Resend henuz kurulmadiysa (RESEND_API_KEY VEYA AUTH_EMAIL_FROM
      // eksikse) client'a acikca soyle — e-posta gonderimi calisiyormus
      // gibi davranip gercek signIn() cagrisini tetiklemesin.
      return NextResponse.json({ ok: true, emailReady: isEmailReady() });
    }

    const existing = await drizzleDb.select({ id: authUser.id }).from(authUser).where(eq(authUser.email, email)).get();
    if (!existing) {
      return NextResponse.json({ error: 'no_account' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('precheck_failed', err);
    return NextResponse.json({ error: 'precheck_failed' }, { status: 500 });
  }
}
