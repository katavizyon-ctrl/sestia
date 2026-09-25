# SESTIA Railway test yayını

26 Eylül 2026.

## Ortam

- Adres: https://sestia-test-staging.up.railway.app/hosgeldin
- GitHub: https://github.com/katavizyon-ctrl/sestia (özel), `main` dalı.
- Railway projesi: `bir-oda-bir-karar` (`b795a2ac-f8ca-4d5f-9a0b-496e6d5d7b1b`).
- Ortam: `staging` (`3d9be47c-8713-4e57-a80e-b67b287ae6af`).
- Servis: `sestia-test` (`87a00049-04a8-4b74-bc80-86b06e4cd775`).
- Kalıcı disk: `sestia-test-volume`, 500 MB, `/app/data`.
- GitHub App erişimi kullanıcı tarafından verildi; servis kaynağı `katavizyon-ctrl/sestia`, dal `main` olarak bağlandı.
- Eski `production` servisi ve diski değiştirilmedi. Yerel kullanıcı verisi buluta kopyalanmadı.

## Yapılandırma

Railpack, `npm run build -- --webpack`, `npm run start`, tek uygulama kopyası ve `/api/health` sağlık kontrolü kullanılıyor. HTTPS alan adı uygulamanın 8080 portuna bağlı.

Yerel Anthropic, Resend ve davet/yönetici kodları gizli Railway değişkenlerine aktarıldı. Test ortamına ayrı bir `AUTH_SECRET` oluşturuldu; değerler kaynak koduna veya bu belgeye yazılmadı. Test ve yönetici giriş çerezleri artık kapsamı ve son kullanma tarihi olan HMAC imzalarıyla doğrulanıyor. Eski `access_ok=1` / `admin_ok=1` çerezleri kabul edilmiyor; yeniden giriş gerekir.

`railway.json` bu yayında çalışıyor. CLI, bu yapılandırma biçiminin 1 Aralık 2026'ya kadar desteklendiğini ve Infrastructure as Code biçimine taşınması gerektiğini bildiriyor. Bu tarih öncesi geçiş planlanmalı: https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code

## Doğrulananlar

- 80 otomatik test başarılı; izole üretim derlemesi gerçek yerel veritabanını değiştirmeden geçti.
- GitHub kaynaklı `2b9e814` sürümü Railway üzerinde başarıyla derlenip çalıştı.
- Canlı `/api/health` 200 döndü; taklit test/yönetici çerezleri 401 ile reddedildi.
- Gerçek davet ve yönetici girişleri, oda oluşturma, fotoğraf yükleme ve fotoğrafı okuma başarılı.
- Test servisi yeniden başlatıldı; oda kaydı ve fotoğrafın SHA-256 özeti değişmedi.
- Gerçek Anthropic sohbet ve fotoğraf analizi çağrıları başarılı.
- Testler ayrı misafir kimliği altında `Yayın doğrulama odası` oluşturur; kullanıcının odalarına eklenmez.

Tekrarlanabilir kontrol: `node tests/staging-smoke.cjs`; isteğe bağlı `--chat` ve `--analysis`. Yeniden başlatma sonrası `--resume` aynı test kimliği ve fotoğrafı kontrol eder. Bu betik yalnızca belirtilen staging adresine istek gönderir; `npm test` içinde otomatik çalışmaz. Geçici oturum dosyası sistemin TEMP klasöründedir ve Git'e alınmaz.

## Açık kalanlar

- E-posta göndermek için kullanıcıdan hedef adres istendi; teslimat ve bağlantıyla giriş henüz doğrulanmadı.
- Günlük disk yedekleme isteği Railway API tarafından `Not Authorized` ile reddedildi. Otomatik yedekleme etkin değildir; hesap/plan yetkisi Railway panelinden çözülmeli. Ücretli plan değişikliği yapılmadı. Kalıcı disk, silinme veya bozulmaya karşı yedek yerine geçmez.
- Bu adres test yayınıdır. Üretime geçiş öncesi e-posta, yedekleme/geri yükleme ve gerçek kullanıcı kabul kontrolleri tamamlanmalıdır.
