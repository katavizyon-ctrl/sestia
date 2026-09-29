# SESTIA — Staging e-posta girişi hatası: teşhis

27 Eylül 2026. Yalnızca teşhis: kod, Railway değişkeni, deploy, commit veya push değişikliği yapılmadı; gerçek e-posta gönderilmedi. Gizli değerler okunmadı ve bu raporda yer almıyor.

## Özet

> **Not — 29.09.2026:** Aşağıdaki ilk teşhis daha sonraki incelemede revize edilmiştir. Kesin kök neden ve doğrulanmış çözüm için `RESOLVED — 2026-09-29` bölümüne bakın.

| | |
|---|---|
| Belirti | "E-posta ile devam et" → "Giriş kodu gönder" → *E-posta gönderilemedi (sunucu e-posta yapılandırmasında bir sorun var).* |
| Kesin neden | Resend API isteği **403 `validation_error`** ile reddediyor: Resend hesabı **test modunda** (doğrulanmış gönderen alan adı yok). Test modunda yalnızca Resend hesabı sahibinin kendi e-posta adresine gönderim yapılabiliyor. Başka bir alıcıya gönderim reddediliyor. |
| Tür | **Staging yapılandırma / Resend hesap sorunu.** Kod hatası değil, Session V2 regresyonu değil. |
| Production | Etkilenmedi (kod ve deploy değişmedi). Ancak aynı Resend hesabı ve gönderen kullanılıyorsa aynı kısıt orada da geçerli olur; production değişkenleri okunmadığı için bu doğrulanmadı. |

## 1. Kanıt: staging logu

Staging, `sestia-test`, deployment `e16b40b3-096d-4bfb-8a77-fc09b854038e` (SUCCESS, 27.09.2026 07:44 +03:00). Başarısız istek anı: `2026-09-27T15:41:45Z`. E-posta adresleri maskelenmiştir.

```
magic_code_sent {"fp":"cbb2e534","codeLength":6}
[auth][error] Error: Resend error: {"statusCode":403,"name":"validation_error",
  "message":"You can only send testing emails to your own email address (<email>).
  To send emails to other recipients, please verify a domain at resend.com/domains,
  and change the `from` address to an email using this domain."}
    at Object.w [as sendVerificationRequest] (/app/.next/server/chunks/_1purobz._.js:17:22)
```

Son 2000 log satırında: 1 kod gönderme denemesi, 1 Resend hatası. İkisi de aynı istek.

## 2. Hata zinciri (kod)

1. İstemci `submitEmail` (`app/page.js`): `/api/account/precheck` (emailReady=true) → `/api/auth/csrf` → `POST /api/auth/signin/resend`.
2. Auth.js `signIn` callback'i: `privateAccess.isAllowedEmail` (owner-only mod kapalı, geçiyor).
3. `sendVerificationRequest` (`lib/auth.js`): `POST https://api.resend.com/emails`, gönderen olarak `AUTH_EMAIL_FROM`. Resend **403** dönüyor, fonksiyon `Resend error: …` fırlatıyor.
4. Auth.js bu hatayı istemciye `error=Configuration` olarak dönüyor. `EMAIL_ERROR_LABELS.Configuration` → "sunucu e-posta yapılandırmasında bir sorun var".

## 3. Ortam değişkenleri (yalnızca isim ve durum)

Railway değişken listesini okumak bu oturumda izin sisteminde reddedildi; tekrar denenmedi. Durum, uygulamanın davranışından çıkarıldı:

| Değişken | Durum | Dayanak |
|---|---|---|
| `RESEND_API_KEY` | Var ve **geçerli** | E-posta formu yalnızca `isEmailReady()` doğruysa gösteriliyor; Resend 401 değil 403 `validation_error` döndü, yani anahtar kimlik doğrulamasını geçti. |
| `AUTH_EMAIL_FROM` | Var, ama **doğrulanmamış bir alan adında** | `isEmailReady()` bunu da boş olmayan değer olarak istiyor; Resend "from adresini doğrulanmış bir alan adına çevir" diyor. |
| `AUTH_SECRET` | Var | Auth.js ve oturumlar çalışıyor; hata imza/secret kaynaklı değil. |
| `PRIVATE_OWNER_EMAIL` | Etkin değil | `/` → `/hosgeldin` yönlendirmesi owner-only modun kapalı olduğunu gösteriyor. |
| `SESTIA_SESSION_POLICY` | Var | Uygulama açılıyor (bu değişken yoksa 503 dönerdi). E-postayla ilgisi yok. |

Eksik bir değişken yok. Sorun bir değişkenin **değeri** (gönderen alan adı) ve Resend hesabının alan adı doğrulama durumu.

## 4. Session V2 ile ilişkisi: yok

- `sendVerificationRequest` gövdesi 45b4817'den (e-posta kodu) bu yana değişmedi: 45b4817 ve f175253'te içerik özeti aynı.
- Session V2 (`20bd3d5`, `f175253`) `lib/auth.js`'te yalnızca `jwt` (sadece doğrulama callback'inde `trigger` signIn/signUp iken) ve `signOut` olayını değiştirdi. İkisi de e-posta **gönderme** adımında çalışmıyor.
- `proxy.js` `/api/auth/*` yollarını eskisi gibi geçiriyor.
- Hata Resend sunucusundan geliyor. Kod, isteği doğru biçimde yapıyor.

Geçmişte giriş neden çalışıyordu? Staging önceden owner-only moddaydı (353cf9e) ve test girişleri Resend hesabı sahibinin adresiyle yapıldı. Test modundaki Resend bu adrese izin veriyor. Kısıt, başka bir alıcı adresi kullanıldığında ortaya çıkıyor.

## 5. Production (salt okunur)

- Deployment `f1b88650-0229-41d4-96a9-a44475af8881`, 21.09.2026. Bu staging zincirinden hiçbir şey içermiyor.
- Production loglarında (son 1000 satır, 12 satır mevcut) Resend hatası yok.
- Production değişkenleri okunmadı. Aynı `RESEND_API_KEY` hesabı ve doğrulanmamış bir `AUTH_EMAIL_FROM` kullanıyorsa, production'da da yalnızca hesap sahibine e-posta gidebilir.

## 6. En küçük düzeltme (uygulanmadı)

Kod değişikliği gerekmez.

1. Resend hesabında sahip olunan bir alan adını doğrulamak (resend.com/domains, DNS kayıtları).
2. Staging `AUTH_EMAIL_FROM` değerini bu alan adında bir adrese çevirmek, örneğin `SESTIA <no-reply@doğrulanmış-alan-adı>`.
3. `RESEND_API_KEY` değişmek zorunda değil. Sadece anahtar alan adının bulunduğu Resend hesabına aitse geçerli.
4. Değişken değişince staging yeniden deploy edilir ve sahip dışı bir adresle "Giriş kodu gönder" yeniden denenir.

Geçici alternatif (düzeltme değil): doğrulama yapılana kadar yalnızca Resend hesabı sahibinin adresiyle test etmek.

## RESOLVED — 2026-09-29

Sorun çözüldü ve uçtan uca doğrulandı. Bu bölüm yukarıdaki teşhisi kapatır. Yukarıdaki bölümler 27 Eylül'deki durumu anlatır ve değiştirilmedi.

### Asıl hata

- Staging kullanıcıya e-posta yapılandırma hatasını gösteriyordu. Railway ve Resend loglarında Resend'den HTTP 403 dönüyordu.
- Resend'e giden asıl isteğin gövdesinde gönderen `Sestia <onboarding@resend.dev>` idi. Bu, Resend'in test göndericisi. Bu yüzden hesap sahibi dışındaki adreslere teslimat reddediliyordu.

### Resend / DNS durumu

- `mail.oneheus.com` Resend'de zaten Verified durumdaydı.
- `RESEND_API_KEY` geçerliydi ve istekler doğru Resend hesabına ulaşıyordu.
- DNS, Cloudflare yetkilendirmesi, DKIM/SPF/DMARC ve doğrulanmış gönderen alan adı kök neden değildi. Son düzeltme için DNS veya Resend alan adı değişikliği gerekmedi.

### Kök neden

- Railway'de saklanan staging değişkeni zaten `AUTH_EMAIL_FROM=SESTIA <login@mail.oneheus.com>` olarak güncellenmişti.
- Çalışan staging deployment'ı (`e16b40b3-096d-4bfb-8a77-fc09b854038e`, 27.09.2026 07:44) bu değişiklikten eskiydi. Konteynerin içinde hâlâ `AUTH_EMAIL_FROM=Sestia <onboarding@resend.dev>` vardı. Bu, `railway ssh` ile hem kabukta hem de `/proc/1/environ` üzerinden okunarak doğrulandı.
- Kod doğruydu. `lib/auth.js`, `from` değerini çalışma anında `process.env.AUTH_EMAIL_FROM`'dan okuyor, derlemede sabitlenmiyor. Auth.js'in kendi varsayılan göndericisi `Auth.js <no-reply@authjs.dev>` ve bu değer istekte görülmedi. Konteynerde `.env.local` da yoktu.
- Eski deployment, Railway'deki yeni değişken değerini hiç almamıştı. `Sestia <onboarding@resend.dev>` değeri depoda yalnızca yerel, gitignore'daki `.env.local` dosyasında geçiyor. Staging'e bu dosya ulaşmadı.

### Düzeltme sırasındaki engel

- 29.09.2026'da Railway'de aktif bir deployment olayı vardı: "API degradation causing slow or stuck deployments."
- İlk yeniden deploy denemesi `Deploys have been paused temporarily` ile reddedildi. Yeni deployment oluşmadı. Alternatif bir deploy yolu denenmedi; Railway'in toparlanması beklendi.

### Son düzeltme

- Railway toparlanmaya başlayınca mevcut staging deployment'ının kod anlık görüntüsü (f175253) `railway redeploy` ile yeniden deploy edildi.
- `--from-source` ve `railway up` kullanılmadı. Güncel HEAD deploy edilmedi. Production'a dokunulmadı. Kaynak dosya ve Railway değişkeni değiştirilmedi.
- Yeni deployment: `5239cc18-e7bc-4f21-8c7c-51504d763406`. SUCCESS durumuna ulaştı ve `/api/health` sağlık kontrolünü geçti.
- Yeni konteyner doğrudan kontrol edildi. Değer tam olarak `AUTH_EMAIL_FROM=SESTIA <login@mail.oneheus.com>` idi.

### Uçtan uca doğrulama

- Hesap sahibi olmayan bir Gmail adresine giriş e-postası gönderildi. Arayüz "E-posta yolda." / 6 haneli kod ekranına geçti.
- İlk Gmail testinde e-posta Spam'e düştü. İkinci, yeni bir Gmail hesabında e-posta doğrudan Gelen Kutusu'na geldi.
- 6 haneli kod girildi ve giriş uçtan uca başarıyla tamamlandı.

### Son durum

- Staging e-posta girişi çalışıyor. Resend üzerinden giden işlem e-postaları çalışıyor. Sorun çözüldü.
- Teslim edilebilirlik ve itibar takibi ileride bir sağlamlaştırma işi olarak kalabilir, şu an engel değil.

### Operasyon notu

Resend beklenmedik şekilde yine `onboarding@resend.dev` adresinden gönderirse şu ikisini karşılaştırın:

1. Railway'de saklanan `AUTH_EMAIL_FROM` değeri
2. Şu an çalışan staging konteynerinin içindeki değer

Railway'de saklanan bir değişken değişikliğinin zaten çalışan bir deployment'a ulaştığını varsaymayın.
